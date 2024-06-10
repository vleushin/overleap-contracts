export function toMicro(src: string): bigint {
    if (src.startsWith('-')) {
        throw Error('Negative numbers not supported');
    }

    if (src === '.') {
        throw Error('Invalid number');
    }
    let parts = src.split('.');
    if (parts.length > 2) {
        throw Error('Invalid number');
    }

    let whole = parts[0];
    let frac = parts[1];
    if (!whole) {
        whole = '0';
    }
    if (!frac) {
        frac = '0';
    }
    if (frac.length > 6) {
        throw Error('Invalid number');
    }
    while (frac.length < 6) {
        frac += '0';
    }

    return BigInt(whole) * 1000000n + BigInt(frac);
}

export function fromMicro(src: bigint) {
    // Convert fraction
    let frac = src % 1000000n;
    let facStr = frac.toString();
    while (facStr.length < 6) {
        facStr = '0' + facStr;
    }
    facStr = facStr.match(/^([0-9]*[1-9]|0)(0*)/)![1];

    // Convert whole
    let whole = src / 1000000n;
    let wholeStr = whole.toString();

    // Value
    let value = `${wholeStr}${facStr === '0' ? '' : `.${facStr}`}`;

    return value;
}
