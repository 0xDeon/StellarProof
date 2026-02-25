#![cfg(test)]

use super::*;
use soroban_sdk::{BytesN, Env};

#[test]
fn test_registry_events() {
    extern crate std;
    let env = Env::default();
    let contract_id = env.register(Registry, ());
    let client = RegistryClient::new(&env, &contract_id);

    let pk = BytesN::from_array(&env, &[1; 32]);
    let hash = BytesN::from_array(&env, &[2; 32]);

    // Test ProviderAdded
    client.add_provider(&pk);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("ProviderAdded"));
    assert!(events_str.contains("registry"));
    assert!(events_str.contains("provider"));

    // Test ProviderRemoved
    client.remove_provider(&pk);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("ProviderRemoved"));
    assert!(events_str.contains("registry"));

    // Test TeeHashAdded
    client.add_tee_hash(&hash);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("TeeHashAdded"));
    assert!(events_str.contains("registry"));
    assert!(events_str.contains("hash"));

    // Test TeeHashRemoved
    client.remove_tee_hash(&hash);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("TeeHashRemoved"));
    assert!(events_str.contains("registry"));
}
