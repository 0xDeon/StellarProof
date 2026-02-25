#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, BytesN, Env,
};

#[contracttype]
pub enum DataKey {
    Provider(BytesN<32>),
    TeeHash(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProviderEventData {
    pub provider: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TeeHashEventData {
    pub hash: BytesN<32>,
}

#[contract]
pub struct Registry;

#[contractimpl]
impl Registry {
    /// Add an authorized Oracle provider to the registry
    pub fn add_provider(env: Env, provider: BytesN<32>) {
        env.storage().persistent().set(&DataKey::Provider(provider.clone()), &true);
        #[allow(deprecated)]
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "registry"),
                soroban_sdk::Symbol::new(&env, "ProviderAdded"),
                provider.clone(),
            ),
            ProviderEventData {
                provider: provider.clone(),
            },
        );
    }

    /// Remove an Oracle provider from the registry
    pub fn remove_provider(env: Env, provider: BytesN<32>) {
        env.storage().persistent().remove(&DataKey::Provider(provider.clone()));
        #[allow(deprecated)]
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "registry"),
                soroban_sdk::Symbol::new(&env, "ProviderRemoved"),
                provider.clone(),
            ),
            ProviderEventData {
                provider: provider.clone(),
            },
        );
    }

    /// Add an authorized TEE hash to the registry
    pub fn add_tee_hash(env: Env, hash: BytesN<32>) {
        env.storage().persistent().set(&DataKey::TeeHash(hash.clone()), &true);
        #[allow(deprecated)]
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "registry"),
                soroban_sdk::Symbol::new(&env, "TeeHashAdded"),
                hash.clone(),
            ),
            TeeHashEventData {
                hash: hash.clone(),
            },
        );
    }

    /// Remove a TEE hash from the registry
    pub fn remove_tee_hash(env: Env, hash: BytesN<32>) {
        env.storage().persistent().remove(&DataKey::TeeHash(hash.clone()));
        #[allow(deprecated)]
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "registry"),
                soroban_sdk::Symbol::new(&env, "TeeHashRemoved"),
                hash.clone(),
            ),
            TeeHashEventData {
                hash: hash.clone(),
            },
        );
    }
}

#[cfg(test)]
mod test;
