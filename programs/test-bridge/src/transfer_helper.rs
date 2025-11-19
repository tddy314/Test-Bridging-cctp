use anchor_lang::{
    prelude::*,
    solana_program::{
        program::{invoke, invoke_signed},
        system_instruction::transfer,
    },
};

use anchor_spl::token::{self, spl_token, Token};

//  transfer SOL from user
pub fn sol_transfer_from_user<'info>(
    signer: &Signer<'info>,
    destination: AccountInfo<'info>,
    system_program: &Program<'info, System>,
    amount: u64,
) -> Result<()> {
    let ix = transfer(signer.key, destination.key, amount);
    invoke(
        &ix,
        &[
            signer.to_account_info(),
            destination,
            system_program.to_account_info(),
        ],
    )?;
    Ok(())
}

// transfer sol from PDA
pub fn sol_transfer_from_pda<'info>(
    source: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    system_program: &Program<'info, System>,
    signers_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    //Your code here
    let ix = transfer(source.key, destination.key, amount);
    invoke_signed(
        &ix,
        &[
            source,
            destination,
            system_program.to_account_info(),
        ],
        signers_seeds,
    )?;
    /*let source_info = source.to_account_info();
    let dest_info = destination.to_account_info();

    let mut from_lamports = source_info.try_borrow_mut_lamports()?;
    let mut to_lamports = dest_info.try_borrow_mut_lamports()?;

    //require!(**from_lamports >= amount, "");

    **from_lamports -= amount;
    **to_lamports += amount;*/

    Ok(())
}


pub fn token_transfer_from_user<'info>(
    from: AccountInfo<'info>,
    authority: &Signer<'info>,
    to: AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new(
        token_program.to_account_info(),
        token::Transfer {
            from: from,
            to: to,
            authority: authority.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}

pub fn token_transfer_from_pda<'info>(
    from: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    to: AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    pda_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    //Your code here

    // let cpi_ctx = CpiContext::new_with_signer(
    //     token_program.to_account_info(), 
    //     token::Transfer {
    //         from,
    //         to,
    //         authority,
    //     }, 
    //     pda_seeds,
    // );

    // token::transfer(cpi_ctx, amount)?;

    let ix = spl_token::instruction::transfer(
        &token_program.key(),
        &from.key(),
        &to.key(),
        &authority.key(),
        &[],
        amount,
    )?;

    invoke_signed(
        &ix,
        &[
            from,
            to,
            authority,
            token_program.to_account_info(),
        ],
        pda_seeds,
    )?;

    Ok(())
}