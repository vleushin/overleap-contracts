export abstract class OverleapRouterOp {
    static set_admin_address = 0xc7c6a031; // 3351683121
    static set_fee_address = 0x9b845e0b; // 2609143307
    static set_fees = 0x4b89c3d4; // 1267319764
    static refund = 0xc135f40c; // 3241538572
}

export abstract class OverleapRouterErrors {
    static not_admin = 100;
    static invalid_amount = 101;
    static invalid_percent = 102;
    static insufficient_amount = 104;
    static insufficient_gas = 105;
    static wrong_workchain = 106;
}


