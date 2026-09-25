const User = require("../models/User");
const bcrypt=require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { sendMail } = require("../utils/Emails");
const { generateOTP } = require("../utils/GenerateOtp");
const Otp = require("../models/OTP");
const { sanitizeUser } = require("../utils/SanitizeUser");
const { generateToken } = require("../utils/GenerateToken");
const PasswordResetToken = require("../models/PasswordResetToken");

const getOAuth2Client = () => {
    return new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
    );
};

exports.googleAuth = async (req, res) => {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
            return res.status(500).json({ message: "Google authentication environment variables are missing." });
        }

        const state = crypto.randomBytes(32).toString("hex");
        res.cookie("oauth_state", state, {
            httpOnly: true,
            maxAge: 10 * 60 * 1000,
            sameSite: process.env.PRODUCTION === 'true' ? 'None' : 'Lax',
            secure: process.env.PRODUCTION === 'true' ? true : false
        });

        const client = getOAuth2Client();
        const authUrl = client.generateAuthUrl({
            access_type: "online",
            scope: ["openid", "email", "profile"],
            state: state
        });

        return res.redirect(authUrl);
    } catch (error) {
        console.error("Error initiating Google auth:", error.message);
        return res.status(500).json({ message: "Failed to initiate Google authentication" });
    }
};

exports.googleCallback = async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    try {
        const { code, state, error: consentError } = req.query;
        const storedState = req.cookies ? req.cookies.oauth_state : null;

        res.clearCookie("oauth_state");

        if (consentError || !code) {
            return res.redirect(frontendUrl);
        }

        if (!state || !storedState || state !== storedState) {
            return res.status(400).json({ message: "Invalid or expired state parameter." });
        }

        const client = getOAuth2Client();
        const { tokens } = await client.getToken(code);

        if (!tokens || !tokens.id_token) {
            return res.status(400).json({ message: "Failed to retrieve Google ID token." });
        }

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).json({ message: "Invalid ID token payload." });
        }

        const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
        if (!validIssuers.includes(payload.iss)) {
            return res.status(400).json({ message: "Invalid token issuer." });
        }

        if (!payload.email_verified) {
            return res.status(400).json({ message: "Google email is not verified." });
        }

        const { sub, email, name } = payload;
        if (!sub || !email) {
            return res.status(400).json({ message: "Missing required identity fields from Google." });
        }

        // Check if returning user by googleId
        let user = await User.findOne({ googleId: sub });

        if (!user) {
            // Check if account with email already exists without linked googleId
            const existingUserByEmail = await User.findOne({ email });
            if (existingUserByEmail) {
                return res.status(409).json({ message: "An account with this email already exists." });
            }

            // Create new Google user
            user = new User({
                name: name || email.split("@")[0],
                email: email,
                googleId: sub,
                isVerified: true,
                isAdmin: false
            });
            await user.save();
        }

        // Issue login JWT token cookie
        const secureInfo = sanitizeUser(user);
        const token = generateToken(secureInfo);

        const expirationDays = parseInt(process.env.COOKIE_EXPIRATION_DAYS) || 30;
        const maxAgeMs = expirationDays * 24 * 60 * 60 * 1000;

        res.cookie('token', token, {
            sameSite: process.env.PRODUCTION === 'true' ? 'None' : 'Lax',
            maxAge: maxAgeMs,
            httpOnly: true,
            secure: process.env.PRODUCTION === 'true' ? true : false
        });

        return res.redirect(frontendUrl);
    } catch (error) {
        console.error("Google Callback Error:", error.message);
        return res.redirect(frontendUrl);
    }
};

exports.signup=async(req,res)=>{
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        const existingUser=await User.findOne({email})
        
        // if user already exists
        if(existingUser){
            return res.status(400).json({"message":"User already exists"})
        }

        // hashing the password
        const hashedPassword=await bcrypt.hash(password,10)

        // creating new user with explicit fields and forced defaults
        const createdUser=new User({
            name,
            email,
            password: hashedPassword,
            isAdmin: false,
            isVerified: false
        })
        await createdUser.save()

        // getting secure user info
        const secureInfo=sanitizeUser(createdUser)

        // generating jwt token
        const token=generateToken(secureInfo)

        const expirationDays = parseInt(process.env.COOKIE_EXPIRATION_DAYS) || 30;
        const maxAgeMs = expirationDays * 24 * 60 * 60 * 1000;

        // sending jwt token in the response cookies
        res.cookie('token',token,{
            sameSite:process.env.PRODUCTION==='true'?"None":'Lax',
            maxAge:maxAgeMs,
            httpOnly:true,
            secure:process.env.PRODUCTION==='true'?true:false
        })

        res.status(201).json(sanitizeUser(createdUser))

    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Error occured during signup, please try again later"})
    }
}

exports.login=async(req,res)=>{
    try {
        if (!req.body.password || !req.body.email) {
            res.clearCookie('token');
            return res.status(400).json({message:"Invalid Credentails"})
        }

        // checking if user exists or not
        const existingUser=await User.findOne({email:req.body.email})

        if (!existingUser || !existingUser.password) {
            res.clearCookie('token');
            return res.status(404).json({message:"Invalid Credentails"})
        }

        // if exists and password matches the hash
        if(existingUser && (await bcrypt.compare(req.body.password,existingUser.password))){

            // getting secure user info
            const secureInfo=sanitizeUser(existingUser)

            // generating jwt token
            const token=generateToken(secureInfo)

            const expirationDays = parseInt(process.env.COOKIE_EXPIRATION_DAYS) || 30;
            const maxAgeMs = expirationDays * 24 * 60 * 60 * 1000;

            // sending jwt token in the response cookies
            res.cookie('token',token,{
                sameSite:process.env.PRODUCTION==='true'?"None":'Lax',
                maxAge:maxAgeMs,
                httpOnly:true,
                secure:process.env.PRODUCTION==='true'?true:false
            })
            return res.status(200).json(sanitizeUser(existingUser))
        }

        res.clearCookie('token');
        return res.status(404).json({message:"Invalid Credentails"})
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Some error occured while logging in, please try again later'})
    }
}

exports.verifyOtp=async(req,res)=>{
    try {
        // Enforce exact 6-digit number string
        if(!req.body.otp || typeof req.body.otp !== 'string' || !/^\d{6}$/.test(req.body.otp)){
            return res.status(400).json({message:"OTP must be an exact 6-digit number string"})
        }

        // checks if user id is existing in the user collection
        const isValidUserId=await User.findById(req.body.userId)

        // if user id does not exists then returns a 404 response
        if(!isValidUserId){
            return res.status(404).json({message:'User not Found, for which the otp has been generated'})
        }

        // checks if otp exists by that user id
        const isOtpExisting=await Otp.findOne({user:isValidUserId._id})

        // if otp does not exists then returns a 404 response
        if(!isOtpExisting){
            return res.status(404).json({message:'Otp not found'})
        }

        // checks if temporary lockout is active
        if(isOtpExisting.lockUntil && isOtpExisting.lockUntil > new Date()){
            return res.status(400).json({message:"Account is temporarily locked due to too many failed attempts. Try again later."})
        }

        // checks if the otp is expired
        if(isOtpExisting.expiresAt < new Date()){
            return res.status(400).json({message:"Otp has been expired"})
        }
        
        // checks if otp matches the hash value
        if(await bcrypt.compare(req.body.otp,isOtpExisting.otp)){
            await Otp.findByIdAndDelete(isOtpExisting._id)
            const verifiedUser=await User.findByIdAndUpdate(isValidUserId._id,{isVerified:true},{new:true})
            return res.status(200).json(sanitizeUser(verifiedUser))
        }

        // Atomic concurrency-safe failed attempt update pipeline in MongoDB
        const lockTime = new Date(Date.now() + 10 * 60 * 1000);
        const updatedOtpDoc = await Otp.findOneAndUpdate(
            { _id: isOtpExisting._id },
            [
                {
                    $set: {
                        attempts: { $add: [{ $ifNull: ["$attempts", 0] }, 1] },
                        lockUntil: {
                            $cond: {
                                if: { $gte: [{ $add: [{ $ifNull: ["$attempts", 0] }, 1] }, 5] },
                                then: lockTime,
                                else: "$lockUntil"
                            }
                        }
                    }
                }
            ],
            { new: true }
        );

        if (updatedOtpDoc && updatedOtpDoc.attempts >= 5) {
            return res.status(400).json({ message: "Too many failed attempts. Account is temporarily locked for 10 minutes." });
        } else {
            return res.status(400).json({ message: 'Otp is invalid or expired' });
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Some Error occured"})
    }
}

exports.resendOtp=async(req,res)=>{
    try {
        const existingUser=await User.findById(req.body.user)

        if(!existingUser){
            return res.status(404).json({"message":"User not found"})
        }

        const existingOtp=await Otp.findOne({user:existingUser._id})

        // Prevent resend if account is temporarily locked
        if(existingOtp && existingOtp.lockUntil && existingOtp.lockUntil > new Date()){
            return res.status(400).json({message:"Account is temporarily locked due to too many failed attempts. Try again later."})
        }

        const otp=generateOTP()
        const hashedOtp=await bcrypt.hash(otp,10)
        const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRATION_TIME || 120000));

        if(existingOtp){
            // Update code and expiry, but preserve attempts and lockUntil state
            existingOtp.otp = hashedOtp;
            existingOtp.expiresAt = expiresAt;
            await existingOtp.save();
        } else {
            const newOtp=new Otp({
                user:req.body.user,
                otp:hashedOtp,
                expiresAt:expiresAt,
                attempts: 0,
                lockUntil: null
            })
            await newOtp.save()
        }

        await sendMail(existingUser.email,`OTP Verification for Your MERN-AUTH-REDUX-TOOLKIT Account`,`Your One-Time Password (OTP) for account verification is: <b>${otp}</b>.</br>Do not share this OTP with anyone for security reasons`)

        res.status(201).json({'message':"OTP sent"})
    } catch (error) {
        res.status(500).json({'message':"Some error occured while resending otp, please try again later"})
        console.log(error);
    }
}

exports.forgotPassword=async(req,res)=>{
    let newToken;
    try {
        // checks if user provided email exists or not
        const isExistingUser=await User.findOne({email:req.body.email})

        // if email does not exists returns a 404 response
        if(!isExistingUser){
            return res.status(404).json({message:"Provided email does not exists"})
        }

        await PasswordResetToken.deleteMany({user:isExistingUser._id})

        // if user exists , generates a password reset token
        const passwordResetToken=generateToken(sanitizeUser(isExistingUser),true)

        // hashes the token
        const hashedToken=await bcrypt.hash(passwordResetToken,10)

        // saves hashed token in passwordResetToken collection
        newToken=new PasswordResetToken({user:isExistingUser._id,token:hashedToken,expiresAt:Date.now() + parseInt(process.env.OTP_EXPIRATION_TIME)})
        await newToken.save()

        // sends the password reset link to the user's mail
        await sendMail(isExistingUser.email,'Password Reset Link for Your MERN-AUTH-REDUX-TOOLKIT Account',`<p>Dear ${isExistingUser.name},

        We received a request to reset the password for your MERN-AUTH-REDUX-TOOLKIT account. If you initiated this request, please use the following link to reset your password:</p>
        
        <p><a href=${process.env.ORIGIN}/reset-password/${isExistingUser._id}/${passwordResetToken} target="_blank">Reset Password</a></p>
        
        <p>This link is valid for a limited time. If you did not request a password reset, please ignore this email. Your account security is important to us.
        
        Thank you,
        The MERN-AUTH-REDUX-TOOLKIT Team</p>`)

        res.status(200).json({message:`Password Reset link sent to ${isExistingUser.email}`})

    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error occured while sending password reset mail'})
    }
}

exports.resetPassword=async(req,res)=>{
    try {
        if (!req.body.token) {
            return res.status(404).json({ message: "Reset Link is Not Valid" });
        }

        // Verify JWT signature, allowed algorithm HS256, expiry, and reset-password purpose
        let decodedToken;
        try {
            decodedToken = jwt.verify(req.body.token, process.env.SECRET_KEY, { algorithms: ['HS256'] });
        } catch (jwtErr) {
            return res.status(404).json({ message: "Reset Link is Not Valid" });
        }

        if (!decodedToken || decodedToken.purpose !== 'reset-password') {
            return res.status(404).json({ message: "Reset Link is Not Valid" });
        }

        // checks if user exists or not
        const isExistingUser=await User.findById(req.body.userId)

        // if user does not exists then returns a 404 response
        if(!isExistingUser){
            return res.status(404).json({message:"User does not exists"})
        }

        // fetches the resetPassword token by the userId
        const isResetTokenExisting=await PasswordResetToken.findOne({user:isExistingUser._id})

        // If token does not exists for that userid, then returns a 404 response
        if(!isResetTokenExisting){
            return res.status(404).json({message:"Reset Link is Not Valid"})
        }

        // if the token has expired then deletes the token, and send response accordingly
        if(isResetTokenExisting.expiresAt < new Date()){
            await PasswordResetToken.findByIdAndDelete(isResetTokenExisting._id)
            return res.status(404).json({message:"Reset Link has been expired"})
        }

        // if token exists and is not expired and token matches the hash, then resets the user password and deletes the token
        if(isResetTokenExisting && isResetTokenExisting.expiresAt>new Date() && (await bcrypt.compare(req.body.token,isResetTokenExisting.token))){

            // deleting the password reset token
            await PasswordResetToken.findByIdAndDelete(isResetTokenExisting._id)

            // resets the password after hashing it
            await User.findByIdAndUpdate(isExistingUser._id,{password:await bcrypt.hash(req.body.password,10)})
            return res.status(200).json({message:"Password Updated Successfuly"})
        }

        return res.status(404).json({message:"Reset Link has been expired"})

    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Error occured while resetting the password, please try again later"})
    }
}

exports.logout=async(req,res)=>{
    try {
        res.cookie('token',{
            maxAge:0,
            sameSite:process.env.PRODUCTION==='true'?"None":'Lax',
            httpOnly:true,
            secure:process.env.PRODUCTION==='true'?true:false
        })
        res.status(200).json({message:'Logout successful'})
    } catch (error) {
        console.log(error);
    }
}

exports.checkAuth=async(req,res)=>{
    try {
        if(req.user){
            const user=await User.findById(req.user._id)
            return res.status(200).json(sanitizeUser(user))
        }
        res.sendStatus(401)
    } catch (error) {
        console.log(error);
        res.sendStatus(500)
    }
}