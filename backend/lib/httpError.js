class HttpError extends Error {
    constructor(status, message, data) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

function positiveId(value, name) {
    const id = Number(value);
    if (
        !["number", "string"].includes(typeof value) ||
        !Number.isInteger(id) || id < 1 || id > 2147483647
    ) {
        throw new HttpError(400, `A valid ${name} is required.`);
    }
    return id;
}

module.exports = { HttpError, positiveId };
