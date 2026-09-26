const SHIPPING_CENTS = 555;
const TAX_CENTS = 500;

class OrderValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "OrderValidationError";
    }
}

const moneyToCents = (value, fieldName = "price") => {
    const valueAsString = String(value);
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(valueAsString);

    if (!match) {
        throw new OrderValidationError(`${fieldName} must be a non-negative amount with at most two decimal places`);
    }

    const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));

    if (!Number.isSafeInteger(cents)) {
        throw new OrderValidationError(`${fieldName} is outside the supported range`);
    }

    return cents;
};

const calculateOrderTotal = (items) => {
    const subtotalCents = items.reduce((total, item) => {
        const unitPriceCents = moneyToCents(item.product.price, "Product price");
        const lineTotalCents = unitPriceCents * item.quantity;

        if (!Number.isSafeInteger(lineTotalCents) || !Number.isSafeInteger(total + lineTotalCents)) {
            throw new OrderValidationError("Order total is outside the supported range");
        }

        return total + lineTotalCents;
    }, 0);

    const totalCents = subtotalCents + SHIPPING_CENTS + TAX_CENTS;

    if (!Number.isSafeInteger(totalCents)) {
        throw new OrderValidationError("Order total is outside the supported range");
    }

    return {
        subtotalCents,
        shippingCents: SHIPPING_CENTS,
        taxCents: TAX_CENTS,
        totalCents,
        total: totalCents / 100,
    };
};

module.exports = {
    SHIPPING_CENTS,
    TAX_CENTS,
    OrderValidationError,
    moneyToCents,
    calculateOrderTotal,
};
