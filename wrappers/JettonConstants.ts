export abstract class JettonOp {

    //hex(260734629)
    //'0xf8a7ea5'
    static transfer = 0xf8a7ea5;


    // hex(1935855772)
    // '0x7362d09c'
    static transfer_notification = 0x7362d09c;

    // hex(395134233)
    // '0x178d4519'
    static internal_transfer = 0x178d4519;

    //hex(3576854235)
    //'0xd53276db'
    static excesses = 0xd53276db;
    static burn = 0x595f07bc;
    static burn_notification = 0x7bdd97de;

    static provide_wallet_address = 0x2c76b973;
    static take_wallet_address = 0xd1735400;
    static mint = 21;
    static change_admin = 3;
    static change_content = 4;
}

