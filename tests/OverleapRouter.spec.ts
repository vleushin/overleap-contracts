import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { OverleapRouter } from '../wrappers/OverleapRouter';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { jettonContentToCell, JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonOp } from '../wrappers/JettonConstants';
import { toMicro } from './convert';
import { OverleapRouterErrors } from '../wrappers/OverleapConstants';

describe('OverleapRouter', () => {
    let router_code: Cell;
    let jwallet_code: Cell;
    let minter_code: Cell;

    beforeAll(async () => {
        router_code = await compile('OverleapRouter');
        jwallet_code = await compile('JettonWallet');
        minter_code = await compile('JettonMinter');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let feeRecipient: SandboxContract<TreasuryContract>;
    let overleapUser: SandboxContract<TreasuryContract>;
    let referralUser: SandboxContract<TreasuryContract>;
    let wrongWorkchainUser: SandboxContract<TreasuryContract>;
    let imposter: SandboxContract<TreasuryContract>;
    let overleapRouter: SandboxContract<OverleapRouter>;

    const defaultFlatFee = toMicro('1.0'); // 1 USDT
    const defaultFeePercent = 10;
    const defaultFeePercentThreshold = toMicro('10.0'); // 10 USDT
    const defaultReferralPercent = 10;

    let jettonMinter: SandboxContract<JettonMinter>;
    let initialJettonBalance: bigint;
    let createUserWallet: any;
    let routerJettonWallet: any;
    let feeRecipientJettonWallet: any;
    let adminJettonWallet: any;
    let deployerJettonWallet: any;
    let overleapUserJettonWallet: any;
    let referralUserJettonWallet: any;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        admin = await blockchain.treasury('admin');
        feeRecipient = await blockchain.treasury('feeRecipient');
        overleapUser = await blockchain.treasury('overleapUser');
        referralUser = await blockchain.treasury('referralUser');
        wrongWorkchainUser = await blockchain.treasury('wrongWorkchainUser', {
            workchain: 1
        });
        imposter = await blockchain.treasury('imposter');

        overleapRouter = blockchain.openContract(
            OverleapRouter.createFromConfig(
                {
                    adminAddress: admin.address,
                    feeAddress: feeRecipient.address,
                    flatFee: defaultFlatFee,
                    feePercent: defaultFeePercent,
                    feePercentThreshold: defaultFeePercentThreshold,
                    referralPercent: defaultReferralPercent
                },
                router_code
            )
        );

        const deployResult = await overleapRouter.sendDeploy(
            deployer.getSender(),
            toNano('1.0'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: overleapRouter.address,
            deploy: true,
            success: true
        });

        const defaultContent = jettonContentToCell({ type: 1, uri: 'https://testjetton.org/content.json' });
        jettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    admin: deployer.address,
                    content: defaultContent,
                    wallet_code: jwallet_code
                },
                minter_code));
        createUserWallet = async (address: Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
                await jettonMinter.getWalletAddress(address)
            )
        );
        const deployMinterResult = await jettonMinter.sendDeploy(deployer.getSender(), toNano('100'));

        expect(deployMinterResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMinter.address,
            deploy: true
        });

        deployerJettonWallet = await createUserWallet(deployer.address);
        initialJettonBalance = toNano('1000.0');
        const mintResult = await jettonMinter.sendMint(deployer.getSender(), deployer.address, initialJettonBalance, toNano('0.05'), toNano('1'));

        expect(mintResult.transactions).toHaveTransaction({
            from: jettonMinter.address,
            to: deployerJettonWallet.address,
            deploy: true
        });
        expect(mintResult.transactions).toHaveTransaction({ // excesses
            from: deployerJettonWallet.address,
            to: jettonMinter.address
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);

        routerJettonWallet = await createUserWallet(overleapRouter.address);
        feeRecipientJettonWallet = await createUserWallet(feeRecipient.address);
        adminJettonWallet = await createUserWallet(admin.address);
        overleapUserJettonWallet = await createUserWallet(overleapUser.address);
        referralUserJettonWallet = await createUserWallet(referralUser.address);
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and overleapRouter are ready to use
    });

    it('admin can set new admin address', async () => {
        const newAdmin = await blockchain.treasury('newAdmin');
        const setAdminAddressResult = await overleapRouter.sendSetAdminAddress(admin.getSender(), {
            address: newAdmin.address,
            value: toNano('0.05')
        });
        expect(setAdminAddressResult.transactions).toHaveTransaction({
            from: admin.address,
            to: overleapRouter.address,
            success: true
        });
        const adminAddressAfter = await overleapRouter.getAdminAddress();
        expect(adminAddressAfter).toEqualAddress(newAdmin.address);
    });

    it('non-admin cannot set new admin address', async () => {
        const setAdminAddressResult = await overleapRouter.sendSetAdminAddress(imposter.getSender(), {
            address: imposter.address,
            value: toNano('0.05')
        });
        expect(setAdminAddressResult.transactions).toHaveTransaction({
            from: imposter.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.not_admin
        });
        const adminAddressAfter = await overleapRouter.getAdminAddress();
        expect(adminAddressAfter).toEqualAddress(admin.address);
    });

    it('admin can set new fee address', async () => {
        const newFeeRecipient = await blockchain.treasury('newFeeRecipient');
        const setFeeAddressResult = await overleapRouter.sendSetFeeAddress(admin.getSender(), {
            address: newFeeRecipient.address,
            value: toNano('0.05')
        });
        expect(setFeeAddressResult.transactions).toHaveTransaction({
            from: admin.address,
            to: overleapRouter.address,
            success: true
        });
        const feeAddressAfter = await overleapRouter.getFeeAddress();
        expect(feeAddressAfter).toEqualAddress(newFeeRecipient.address);
    });

    it('non-admin cannot set new fee address', async () => {
        const setFeeAddressResult = await overleapRouter.sendSetFeeAddress(imposter.getSender(), {
            address: imposter.address,
            value: toNano('0.05')
        });
        expect(setFeeAddressResult.transactions).toHaveTransaction({
            from: imposter.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.not_admin
        });
        const feeAddressAfter = await overleapRouter.getFeeAddress();
        expect(feeAddressAfter).toEqualAddress(feeRecipient.address);
    });

    it('admin can set new fees', async () => {
        const newFlatFee = 100000n;
        const newFeePercent = 10;
        const setFeeAddressResult = await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: newFlatFee,
            feePercent: newFeePercent,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: defaultReferralPercent,
            value: toNano('0.05')
        });
        expect(setFeeAddressResult.transactions).toHaveTransaction({
            from: admin.address,
            to: overleapRouter.address,
            success: true
        });
        const feesAfter = await overleapRouter.getFees();
        expect(feesAfter.flatFee).toBe(newFlatFee);
        expect(feesAfter.feePercent).toBe(newFeePercent);
    });

    it('non admin cannot set new fees', async () => {
        const newFlatFee = 100000n;
        const newFeePercent = 10;
        const setFeeAddressResult = await overleapRouter.sendSetFees(imposter.getSender(), {
            flatFee: newFlatFee,
            feePercent: newFeePercent,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: defaultReferralPercent,
            value: toNano('0.05')
        });
        expect(setFeeAddressResult.transactions).toHaveTransaction({
            from: imposter.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.not_admin
        });
        const feesAfter = await overleapRouter.getFees();
        expect(feesAfter.flatFee).toBe(defaultFlatFee);
        expect(feesAfter.feePercent).toBe(defaultFeePercent);
    });

    it('admin can set zero fees', async () => {
        const newFlatFee = 0n;
        const newFeePercent = 0;
        const setFeeAddressResult = await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: newFlatFee,
            feePercent: newFeePercent,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: defaultReferralPercent,
            value: toNano('0.05')
        });
        expect(setFeeAddressResult.transactions).toHaveTransaction({
            from: admin.address,
            to: overleapRouter.address,
            success: true
        });
        const feesAfter = await overleapRouter.getFees();
        expect(feesAfter.flatFee).toBe(0n);
        expect(feesAfter.feePercent).toBe(0);
    });

    it('admin cannot set feePercent over 100', async () => {
        const setFeeAddressResult1 = await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: 0n,
            feePercent: 101,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: defaultReferralPercent,
            value: toNano('0.05')
        });
        expect(setFeeAddressResult1.transactions).toHaveTransaction({
            from: admin.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.invalid_percent
        });
        const setFeeAddressResult2 = await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: 0n,
            feePercent: 100,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: defaultReferralPercent,
            value: toNano('0.05')
        });
        expect(setFeeAddressResult2.transactions).toHaveTransaction({
            from: admin.address,
            to: overleapRouter.address,
            success: true
        });
        const setFeeAddressResult3 = await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: defaultFlatFee,
            feePercent: defaultFeePercent,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: 101,
            value: toNano('0.05')
        });
        expect(setFeeAddressResult3.transactions).toHaveTransaction({
            from: admin.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.invalid_percent
        });
        const setFeeAddressResult4 = await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: 0n,
            feePercent: 100,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: 100,
            value: toNano('0.05')
        });
        expect(setFeeAddressResult4.transactions).toHaveTransaction({
            from: admin.address,
            to: overleapRouter.address,
            success: true
        });
    });

    it('admin can get refund', async () => {
        const sentAmountJetton = toMicro('5.0');
        const halfOfSentAmountJetton = toMicro('2.5');
        const forwardPayload = beginCell().endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            0,
            forwardPayload);
        expect(await overleapRouter.getBalance()).toBeGreaterThan(toNano('0.9'));
        expect(await routerJettonWallet.getJettonBalance()).toEqual(sentAmountJetton);
        expect(await adminJettonWallet.getJettonBalance()).toEqual(0n);
        await overleapRouter.sendRefund(admin.getSender(),
            {
                jettonAddress: routerJettonWallet.address,
                jettonAmount: halfOfSentAmountJetton,
                value: toNano('0.05')
            });
        expect(await overleapRouter.getBalance()).toBeLessThan(toNano('0.1'));
        expect(await routerJettonWallet.getJettonBalance()).toEqual(halfOfSentAmountJetton);
        expect(await adminJettonWallet.getJettonBalance()).toEqual(halfOfSentAmountJetton);
        await overleapRouter.sendRefund(admin.getSender(),
            {
                jettonAddress: routerJettonWallet.address,
                jettonAmount: halfOfSentAmountJetton,
                value: toNano('0.05')
            });
        expect(await overleapRouter.getBalance()).toBeLessThan(toNano('0.1'));
        expect(await routerJettonWallet.getJettonBalance()).toEqual(0n);
        expect(await adminJettonWallet.getJettonBalance()).toEqual(sentAmountJetton);
    });

    it('non-admin cannot get refund', async () => {
        const sentAmountJetton = toMicro('5.0');
        const forwardPayload = beginCell().endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            0,
            forwardPayload);
        expect(await overleapRouter.getBalance()).toBeGreaterThan(toNano('0.9'));
        expect(await routerJettonWallet.getJettonBalance()).toEqual(sentAmountJetton);
        expect(await adminJettonWallet.getJettonBalance()).toEqual(0n);
        const sendResult = await overleapRouter.sendRefund(imposter.getSender(),
            {
                jettonAddress: routerJettonWallet.address,
                jettonAmount: sentAmountJetton,
                value: toNano('0.05')
            });
        expect(sendResult.transactions).toHaveTransaction({
            from: imposter.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.not_admin
        });
    });

    it('should route jettons', async () => {
        const initialTotalSupply = await jettonMinter.getTotalSupply();
        const initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        const sentAmount = toMicro('5.0');
        const forwardAmount = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(0, 1)
            .endCell();
        const sendResult = await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmount,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmount,
            forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({ //excesses
            from: routerJettonWallet.address,
            to: overleapRouter.address
        });
        expect(sendResult.transactions).toHaveTransaction({ //transfer_notification
            from: routerJettonWallet.address,
            to: overleapRouter.address,
            value: forwardAmount,
            body: beginCell().storeUint(JettonOp.transfer_notification, 32)
                .storeUint(0, 64) //default queryId
                .storeCoins(sentAmount)
                .storeAddress(deployer.address)
                .storeUint(1, 1)
                .storeRef(forwardPayload)
                .endCell()
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
        expect(await routerJettonWallet.getJettonBalance()).toEqual(0n);
        expect(await jettonMinter.getTotalSupply()).toEqual(initialTotalSupply);
        expect(await feeRecipientJettonWallet.getJettonBalance()).toEqual(defaultFlatFee);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmount - defaultFlatFee);
    });

    it('should route jettons (flat_fee)', async () => {
        const sentAmountJetton = toMicro('5.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(0, 1) // without referral
            .endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        const fee = defaultFlatFee;
        expect(await feeRecipientJettonWallet.getJettonBalance()).toEqual(fee);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmountJetton - fee);
    });

    it('should route jettons (flat_fee + referral)', async () => {
        const sentAmountJetton = toMicro('5.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(1, 1) // with referral
            .storeAddress(referralUser.address)
            .endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        const fee = defaultFlatFee;
        const referralCut = fee * BigInt(defaultReferralPercent) / 100n;
        const feeWithReferralCut = fee - referralCut;
        expect(await feeRecipientJettonWallet.getJettonBalance()).toEqual(feeWithReferralCut);
        expect(await referralUserJettonWallet.getJettonBalance()).toEqual(referralCut);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmountJetton - fee);
    });

    it('should route jettons (fee_percent)', async () => {
        const sentAmountJetton = toMicro('100.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(0, 1) // without referral
            .endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        const fee = sentAmountJetton * BigInt(defaultFeePercent) / 100n;
        expect(await feeRecipientJettonWallet.getJettonBalance()).toEqual(fee);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmountJetton - fee);
    });

    it('should route jettons (fee_percent + referral)', async () => {
        const sentAmountJetton = toMicro('100.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(1, 1) // with referral
            .storeAddress(referralUser.address)
            .endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        const fee = sentAmountJetton * BigInt(defaultFeePercent) / 100n;
        const referralCut = fee * BigInt(defaultReferralPercent) / 100n;
        const feeWithReferralCut = fee - referralCut;
        expect(await feeRecipientJettonWallet.getJettonBalance()).toEqual(feeWithReferralCut);
        expect(await referralUserJettonWallet.getJettonBalance()).toEqual(referralCut);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmountJetton - fee);
    });

    it('should route jettons (only flat_fee)', async () => {
        await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: defaultFlatFee,
            feePercent: 0,
            feePercentThreshold: toMicro('430000002.0'), // large number to never reach threshold, e.g. USDT total supply
            referralPercent: defaultReferralPercent,
            value: toNano('0.05')
        });
        const sentAmountJetton = toMicro('100.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(0, 1) // without referral
            .endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        const fee = defaultFlatFee;
        expect(await feeRecipientJettonWallet.getJettonBalance()).toEqual(fee);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmountJetton - fee);
    });

    it('should route jettons (only fee_percent)', async () => {
        await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: defaultFlatFee,
            feePercent: defaultFeePercent,
            feePercentThreshold: 0n,
            referralPercent: defaultReferralPercent,
            value: toNano('0.05')
        });
        const sentAmountJetton = toMicro('5.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(0, 1) // without referral
            .endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        const fee = sentAmountJetton * BigInt(defaultFeePercent) / 100n;
        expect(await feeRecipientJettonWallet.getJettonBalance()).toEqual(fee);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmountJetton - fee);
    });

    it('should route jettons (no fees)', async () => {
        await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: 0n,
            feePercent: 0,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: defaultReferralPercent,
            value: toNano('0.05')
        });
        const sentAmountJetton = toMicro('5.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(0, 1) // without referral
            .endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmountJetton);
    });

    it('should route jettons (zero referral_percent)', async () => {
        await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: defaultFlatFee,
            feePercent: defaultFeePercent,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: 0,
            value: toNano('0.05')
        });
        const sentAmountJetton = toMicro('5.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(1, 1) // with referral
            .storeAddress(referralUser.address)
            .endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        const fee = defaultFlatFee;
        expect(await feeRecipientJettonWallet.getJettonBalance()).toEqual(fee);
        expect(await referralUserJettonWallet.getJettonBalance()).toEqual(0n);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmountJetton - fee);
    });

    it('should route jettons (100% referral_percent)', async () => {
        await overleapRouter.sendSetFees(admin.getSender(), {
            flatFee: defaultFlatFee,
            feePercent: defaultFeePercent,
            feePercentThreshold: defaultFeePercentThreshold,
            referralPercent: 100,
            value: toNano('0.05')
        });
        const sentAmountJetton = toMicro('5.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(1, 1) // with referral
            .storeAddress(referralUser.address)
            .endCell();
        await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        const fee = defaultFlatFee;
        expect(await feeRecipientJettonWallet.getJettonBalance()).toEqual(0n);
        expect(await referralUserJettonWallet.getJettonBalance()).toEqual(fee);
        expect(await overleapUserJettonWallet.getJettonBalance()).toEqual(sentAmountJetton - fee);
    });

    it('should not route jettons (INVALID_AMOUNT)', async () => {
        const sentAmountJetton = toMicro('0.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(0, 1) // without referral
            .endCell();
        const sendResult = await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({
            from: routerJettonWallet.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.invalid_amount
        });
    });

    it('should not route jettons (INSUFFICIENT_AMOUNT)', async () => {
        const sentAmountJetton = toMicro('1.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(0, 1) // without referral
            .endCell();
        const sendResult = await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({
            from: routerJettonWallet.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.insufficient_amount
        });
    });

    it('should not route jettons (INSUFFICIENT_GAS)', async () => {
        const sentAmountJetton = toMicro('1.0');
        const forwardAmountTon = toNano('0.01');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(0, 1) // without referral
            .endCell();
        const sendResult = await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({
            from: routerJettonWallet.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.insufficient_gas
        });
    });

    it('should not route jettons (to_address + WRONG_WORKCHAIN)', async () => {
        const sentAmountJetton = toMicro('5.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(wrongWorkchainUser.address)
            .storeUint(0, 1) // with referral
            .endCell();
        const sendResult = await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({
            from: routerJettonWallet.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.wrong_workchain
        });
    });

    it('should not route jettons (referral_address + WRONG_WORKCHAIN)', async () => {
        const sentAmountJetton = toMicro('5.0');
        const forwardAmountTon = toNano('0.5');
        const forwardPayload = beginCell()
            .storeAddress(overleapUser.address)
            .storeUint(1, 1) // with referral
            .storeAddress(wrongWorkchainUser.address)
            .endCell();
        const sendResult = await deployerJettonWallet.sendTransfer(
            deployer.getSender(),
            toNano('1.0'), //tons
            sentAmountJetton,
            overleapRouter.address,
            deployer.address,
            null,
            forwardAmountTon,
            forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({
            from: routerJettonWallet.address,
            to: overleapRouter.address,
            aborted: true,
            exitCode: OverleapRouterErrors.wrong_workchain
        });
    });
});
