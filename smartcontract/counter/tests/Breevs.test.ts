// @ts-nocheck
import {
    Clarinet,
    Tx,
    Chain,
    Account,
    types,
} from "https://deno.land/x/clarinet/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";

const CONTRACT_NAME = "Breevs";
const VALID_STAKE = 1000000; // 1 STX
const VALID_DURATION = 100; // blocks
const MIN_HOST_BALANCE = 1000000000; // 1000 STX

// Utility: Setup full game with all 6 players (host + 5 others)
function setupFullGame(chain: Chain, accounts: Account[]) {
    const [deployer, p1, p2, p3, p4, p5] = accounts;
    
    let block = chain.mineBlock([
        Tx.contractCall(
            CONTRACT_NAME,
            "create-game",
            [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
            deployer.address
        ),
        Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], p1.address),
        Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], p2.address),
        Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], p3.address),
        Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], p4.address),
        Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], p5.address),
    ]);
    
    return block;
}

// ============================================
// GAME CREATION TESTS
// ============================================

Clarinet.test({
    name: "Game creation works with valid stake and duration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
        ]);

        block.receipts[0].result.expectOk().expectUint(1);
    },
});

Clarinet.test({
    name: "Game creation fails with stake below minimum",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(999999), types.uint(VALID_DURATION)],
                deployer.address
            ),
        ]);

        block.receipts[0].result.expectErr().expectUint(406); // ERR-INVALID-STAKE
    },
});

Clarinet.test({
    name: "Game creation fails with invalid duration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(5)],
                deployer.address
            ),
        ]);

        block.receipts[0].result.expectErr().expectUint(407); // ERR-INVALID-DURATION
    },
});

Clarinet.test({
    name: "Multiple games can be created with incrementing IDs",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                wallet1.address
            ),
        ]);

        block.receipts[0].result.expectOk().expectUint(1);
        block.receipts[1].result.expectOk().expectUint(2);
    },
});

// ============================================
// JOIN GAME TESTS
// ============================================

Clarinet.test({
    name: "Player can join a game with correct stake",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const player1 = accounts.get("wallet_1")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
            Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], player1.address),
        ]);

        block.receipts[1].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Cannot join non-existent game",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get("wallet_1")!;

        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(999)], player1.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(404); // ERR-GAME-NOT-FOUND
    },
});

Clarinet.test({
    name: "Cannot join same game twice",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const player1 = accounts.get("wallet_1")!;

        chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
            Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], player1.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], player1.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(401); // ERR-UNAUTHORIZED
    },
});

Clarinet.test({
    name: "Cannot join game that's already full (7th player)",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const accountsList = [
            accounts.get("wallet_1")!,
            accounts.get("wallet_2")!,
            accounts.get("wallet_3")!,
            accounts.get("wallet_4")!,
            accounts.get("wallet_5")!,
            accounts.get("wallet_6")!,
        ];

        // Setup full game with 6 players
        setupFullGame(chain, [deployer, ...accountsList.slice(0, 5)]);

        // Try to join with 7th player (should fail)
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], accountsList[5].address),
        ]);

        block.receipts[0].result.expectErr().expectUint(100); // ERR-GAME-FULL
    },
});

Clarinet.test({
    name: "Prize pool accumulates as players join (6 players)",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const accountsList = [
            accounts.get("wallet_1")!,
            accounts.get("wallet_2")!,
            accounts.get("wallet_3")!,
            accounts.get("wallet_4")!,
            accounts.get("wallet_5")!,
        ];

        setupFullGame(chain, [deployer, ...accountsList]);

        let gameInfo = chain.callReadOnlyFn(
            CONTRACT_NAME,
            "get-game-info",
            [types.uint(1)],
            deployer.address
        );

        const prizePool = gameInfo.result.expectSome().expectTuple()["prize-pool"];
        assertEquals(prizePool, `u${VALID_STAKE * 6}`); // 6 players total
    },
});

// ============================================
// START GAME TESTS
// ============================================

Clarinet.test({
    name: "Only creator can start the game",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const accountsList = [
            accounts.get("wallet_1")!,
            accounts.get("wallet_2")!,
            accounts.get("wallet_3")!,
            accounts.get("wallet_4")!,
            accounts.get("wallet_5")!,
        ];

        setupFullGame(chain, [deployer, ...accountsList]);

        // Non-creator tries to start
        let badStart = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "start-game", [types.uint(1)], accountsList[0].address),
        ]);
        badStart.receipts[0].result.expectErr().expectUint(401); // ERR-UNAUTHORIZED

        // Creator starts successfully
        let goodStart = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "start-game", [types.uint(1)], deployer.address),
        ]);
        goodStart.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Cannot start game without all 6 players",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const player1 = accounts.get("wallet_1")!;

        chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
            Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], player1.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "start-game", [types.uint(1)], deployer.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(100); // ERR-GAME-FULL
    },
});

Clarinet.test({
    name: "Cannot start already started game",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const accountsList = [
            accounts.get("wallet_1")!,
            accounts.get("wallet_2")!,
            accounts.get("wallet_3")!,
            accounts.get("wallet_4")!,
            accounts.get("wallet_5")!,
        ];

        setupFullGame(chain, [deployer, ...accountsList]);
        
        chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "start-game", [types.uint(1)], deployer.address),
        ]);

        // Try to start again
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "start-game", [types.uint(1)], deployer.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(402); // ERR-INVALID-STATE
    },
});

// ============================================
// SPIN TESTS (NEW - Core Gameplay)
// ============================================

Clarinet.test({
    name: "Host can spin to eliminate a player",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const accountsList = [
            accounts.get("wallet_1")!,
            accounts.get("wallet_2")!,
            accounts.get("wallet_3")!,
            accounts.get("wallet_4")!,
            accounts.get("wallet_5")!,
        ];

        setupFullGame(chain, [deployer, ...accountsList]);
        
        chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "start-game", [types.uint(1)], deployer.address),
        ]);

        // Host spins
        let spinBlock = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "spin", [types.uint(1)], deployer.address),
        ]);

        // Should return the eliminated player's principal
        spinBlock.receipts[0].result.expectOk();
    },
});

Clarinet.test({
    name: "Non-host cannot spin",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const accountsList = [
            accounts.get("wallet_1")!,
            accounts.get("wallet_2")!,
            accounts.get("wallet_3")!,
            accounts.get("wallet_4")!,
            accounts.get("wallet_5")!,
        ];

        setupFullGame(chain, [deployer, ...accountsList]);
        
        chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "start-game", [types.uint(1)], deployer.address),
        ]);

        // Non-host tries to spin
        let spinBlock = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "spin", [types.uint(1)], accountsList[0].address),
        ]);

        spinBlock.receipts[0].result.expectErr().expectUint(411); // ERR-NOT-HOST
    },
});

Clarinet.test({
    name: "Cannot spin on non-started game",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const accountsList = [
            accounts.get("wallet_1")!,
            accounts.get("wallet_2")!,
            accounts.get("wallet_3")!,
            accounts.get("wallet_4")!,
            accounts.get("wallet_5")!,
        ];

        setupFullGame(chain, [deployer, ...accountsList]);

        // Try to spin before starting
        let spinBlock = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "spin", [types.uint(1)], deployer.address),
        ]);

        spinBlock.receipts[0].result.expectErr().expectUint(402); // ERR-INVALID-STATE
    },
});

// ============================================
// LEADERBOARD TESTS (NEW)
// ============================================

Clarinet.test({
    name: "User stats are initialized when joining a game",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
        ]);

        let stats = chain.callReadOnlyFn(
            CONTRACT_NAME,
            "get-user-stats",
            [types.principal(deployer.address)],
            deployer.address
        );

        const userStats = stats.result.expectTuple();
        assertEquals(userStats["games-played"], "u1");
        assertEquals(userStats["total-staked"], `u${VALID_STAKE}`);
    },
});

Clarinet.test({
    name: "User stats accumulate across multiple games",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
        ]);

        let stats = chain.callReadOnlyFn(
            CONTRACT_NAME,
            "get-user-stats",
            [types.principal(deployer.address)],
            deployer.address
        );

        const userStats = stats.result.expectTuple();
        assertEquals(userStats["games-played"], "u2");
        assertEquals(userStats["total-staked"], `u${VALID_STAKE * 2}`);
    },
});

// ============================================
// READ-ONLY FUNCTION TESTS
// ============================================

Clarinet.test({
    name: "get-active-players-count returns correct count",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;
        const player1 = accounts.get("wallet_1")!;

        chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
            Tx.contractCall(CONTRACT_NAME, "join-game", [types.uint(1)], player1.address),
        ]);

        let count = chain.callReadOnlyFn(
            CONTRACT_NAME,
            "get-active-players-count",
            [types.uint(1)],
            deployer.address
        );

        count.result.expectUint(2);
    },
});

Clarinet.test({
    name: "is-player-eliminated returns false for active player",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
        ]);

        let result = chain.callReadOnlyFn(
            CONTRACT_NAME,
            "is-player-eliminated",
            [types.uint(1), types.principal(deployer.address)],
            deployer.address
        );

        result.result.expectBool(false);
    },
});

Clarinet.test({
    name: "get-game-info returns correct game data",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
        ]);

        let gameInfo = chain.callReadOnlyFn(
            CONTRACT_NAME,
            "get-game-info",
            [types.uint(1)],
            deployer.address
        );

        const game = gameInfo.result.expectSome().expectTuple();
        assertEquals(game["stake"], `u${VALID_STAKE}`);
        assertEquals(game["status"], "u0"); // STATUS-CREATED
    },
});

Clarinet.test({
    name: "get-player-game-data returns player info",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
        ]);

        let playerData = chain.callReadOnlyFn(
            CONTRACT_NAME,
            "get-player-game-data",
            [types.uint(1), types.principal(deployer.address)],
            deployer.address
        );

        const data = playerData.result.expectSome().expectTuple();
        assertEquals(data["eliminated"], "false");
    },
});

// ============================================
// PRIZE CLAIM TESTS
// ============================================

Clarinet.test({
    name: "Cannot claim prize from non-existent game",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "claim-prize", [types.uint(999)], deployer.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(404); // ERR-GAME-NOT-FOUND
    },
});

Clarinet.test({
    name: "Cannot claim prize from non-completed game",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get("deployer")!;

        chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                "create-game",
                [types.uint(VALID_STAKE), types.uint(VALID_DURATION)],
                deployer.address
            ),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, "claim-prize", [types.uint(1)], deployer.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(402); // ERR-INVALID-STATE
    },
});