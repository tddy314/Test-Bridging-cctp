use anchor_lang::{
    prelude::*,
    solana_program:: {instruction::Instruction, program::invoke_signed}
};
use anchor_spl::{
    token::Token,
    token_interface:: {Mint, TokenAccount}
};
pub mod transfer_helper;

declare_id!("5bTL7owZy4yjBJDC7zmMw57WsqTJPTJEB15nAnciRahA");

#[program]
pub mod test_bridge {
    use std::str::FromStr;

    use crate::transfer_helper::token_transfer_from_user;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let vault_info = &mut ctx.accounts.vault_info;
        vault_info.bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn send(ctx: Context<Send>, amount_in: u64, domain: u32, recipient: Pubkey) -> Result<()> {
        
        let vault = &ctx.accounts.vault;
        let vault_info = &ctx.accounts.vault_info;
        
        token_transfer_from_user(
            ctx.accounts.user_ata.to_account_info(),
            &ctx.accounts.user,
            ctx.accounts.vault_ata.to_account_info(),
            &ctx.accounts.token_program,
            amount_in,
        )?;

        let cpi_program_id = Pubkey::from_str("CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe").unwrap();

        let params = DepositForBurnParams {
            amount: amount_in,
            destination_domain: domain,
            mint_recipient: recipient,
            destination_caller: Pubkey::default(),
            max_fee: 999999,
            min_finality_threshold: 2000
        };
        let mut data = Vec::new();
        let discriminator = anchor_lang::solana_program::hash::hash(b"global:deposit_for_burn").to_bytes();
        data.extend_from_slice(&discriminator[..8]);

        let params_bytes = params.try_to_vec().unwrap();
        data.extend_from_slice(&params_bytes);

        let ix = Instruction {
            program_id: cpi_program_id,
            accounts: ctx.remaining_accounts
            .iter()
            .map(|acc| {
                let is_pda_signer = *acc.key == vault.key();
                AccountMeta {
                    pubkey: *acc.key,
                    is_signer:  is_pda_signer || acc.is_signer,
                    is_writable: acc.is_writable,
                }
            })
            .collect(),
            data
        };
        let seed_prefix: &[u8] = b"CONTRACT"; 
        let signer_seeds: &[&[&[u8]]] = &[&[seed_prefix, &[vault_info.bump]]];
        invoke_signed(&ix, &ctx.remaining_accounts, signer_seeds)?;
        Ok(())
    }

}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// CHECK:
    #[account(
        init,
        seeds = [b"CONTRACT"],
        bump,
        payer = user,
        space = 0
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        init,
        seeds = [b"DATA"],
        bump,
        payer = user,
        space = 8 + std::mem::size_of::<VaultInfo>(),
    )]
    pub vault_info: Box<Account<'info, VaultInfo>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct Send<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: 
    #[account(
        seeds = [b"CONTRACT"],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        seeds = [b"DATA"],
        bump,
    )]
    pub vault_info: Box<Account<'info, VaultInfo>>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user
    )]
    pub user_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = vault
    )]
    pub vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Program<'info, Token>,

}

#[account]
#[derive(Default)]
pub struct VaultInfo {
    pub bump: u8
}
#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DepositForBurnParams {
    pub amount: u64,
    pub destination_domain: u32,
    pub mint_recipient: Pubkey,
    // For no destination caller, use Pubkey::default()
    pub destination_caller: Pubkey,
    pub max_fee: u64,
    pub min_finality_threshold: u32,
}