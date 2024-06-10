import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { OverleapRouterOp } from './OverleapConstants';

export type OverleapRouterConfig = {
    adminAddress: Address;
    feeAddress: Address;
} & FeesConfig;

export type FeesConfig = {
    flatFee: bigint;
    feePercent: number;
    feePercentThreshold: bigint;
    referralPercent: number;
}

export function overleapRouterConfigToCell(config: OverleapRouterConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.feeAddress)
        .storeCoins(config.flatFee)
        .storeUint(config.feePercent, 7)
        .storeCoins(config.feePercentThreshold)
        .storeUint(config.feePercent, 7)
        .endCell();
}

export class OverleapRouter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new OverleapRouter(address);
    }

    static createFromConfig(config: OverleapRouterConfig, code: Cell, workchain = 0) {
        const data = overleapRouterConfigToCell(config);
        const init = { code, data };
        return new OverleapRouter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell()
        });
    }

    async sendSetAdminAddress(
        provider: ContractProvider,
        via: Sender,
        opts: {
            address: Address;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OverleapRouterOp.set_admin_address, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.address)
                .endCell()
        });
    }

    async sendSetFeeAddress(
        provider: ContractProvider,
        via: Sender,
        opts: {
            address: Address;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OverleapRouterOp.set_fee_address, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.address)
                .endCell()
        });
    }

    async sendSetFees(
        provider: ContractProvider,
        via: Sender,
        opts: {
            flatFee: bigint;
            feePercent: number;
            feePercentThreshold: bigint;
            referralPercent: number;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OverleapRouterOp.set_fees, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeCoins(opts.flatFee)
                .storeUint(opts.feePercent, 7)
                .storeCoins(opts.feePercentThreshold)
                .storeUint(opts.referralPercent, 7)
                .endCell()
        });
    }

    async sendRefund(
        provider: ContractProvider,
        via: Sender,
        opts: {
            jettonAddress: Address;
            jettonAmount: bigint;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OverleapRouterOp.refund, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.jettonAddress)
                .storeCoins(opts.jettonAmount)
                .endCell()
        });
    }

    async getAdminAddress(provider: ContractProvider) {
        const result = await provider.get('get_admin_address', []);
        return result.stack.readAddress();
    }

    async getFeeAddress(provider: ContractProvider) {
        const result = await provider.get('get_fee_address', []);
        return result.stack.readAddress();
    }

    async getFees(provider: ContractProvider): Promise<FeesConfig> {
        const result = await provider.get('get_fees', []);
        return {
            flatFee: result.stack.readBigNumber(),
            feePercent: result.stack.readNumber(),
            feePercentThreshold: result.stack.readBigNumber(),
            referralPercent: result.stack.readNumber()
        }
    }

    async getBalance(provider: ContractProvider): Promise<bigint> {
        const state = await provider.getState();
        return state.balance;
    }
}
