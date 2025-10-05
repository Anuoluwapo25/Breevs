;; Breevs Russian Roulette Contract - Full PRD Implementation
;; Includes: spin mechanics, leaderboard, host restrictions, complete game flow

(define-constant MAX-PLAYERS u6) ;; Host + 5 players = 6 total
(define-constant ERR-GAME-NOT-FOUND u404)
(define-constant ERR-GAME-FULL u100)
(define-constant ERR-UNAUTHORIZED u401)
(define-constant ERR-INVALID-STATE u402)
(define-constant ERR-TIME-EXPIRED u403)
(define-constant ERR-INSUFFICIENT-BALANCE u404)
(define-constant ERR-ALREADY-ELIMINATED u405)
(define-constant ERR-INVALID-STAKE u406)
(define-constant ERR-INVALID-DURATION u407)
(define-constant ERR-NOT-WINNER u408)
(define-constant ERR-ALREADY-CLAIMED u409)
(define-constant ERR-NO-WINNER u410)
(define-constant ERR-NOT-HOST u411)
(define-constant ERR-ROUND-NOT-ACTIVE u412)
(define-constant ERR-MIN-BALANCE-NOT-MET u413)

;; Game status constants
(define-constant STATUS-CREATED u0)
(define-constant STATUS-IN-PROGRESS u1)
(define-constant STATUS-COMPLETED u2)

;; Validation constants
(define-constant MIN-STAKE u1000000) ;; 1 STX minimum
(define-constant MAX-STAKE u1000000000000) ;; 1M STX maximum
(define-constant MIN-ROUND-DURATION u10) ;; 10 blocks minimum
(define-constant MAX-ROUND-DURATION u1000) ;; 1000 blocks maximum
(define-constant MIN-HOST-BALANCE u1000000000) ;; 1000 STX minimum balance to create game

(define-data-var game-counter uint u0)

;; Main game data structure
(define-map games
  uint
  {
    creator: principal,
    players: (list 6 principal),
    stake: uint,
    prize-pool: uint,
    status: uint,
    round-duration: uint,
    round-end: uint,
    current-round: uint,
    winner: (optional principal),
    total-rounds: uint
  }
)

;; Player-specific data per game
(define-map player-game-data
  {game-id: uint, player: principal}
  {
    eliminated: bool,
    elimination-round: uint
  }
)

;; Token deposits tracking
(define-map player-deposits
  {game-id: uint, player: principal}
  uint
)

;; Track if winner has claimed prize
(define-map prize-claimed
  uint
  bool
)

;; Leaderboard tracking
(define-map user-stats
  principal
  {
    games-played: uint,
    games-won: uint,
    total-winnings: uint,
    total-staked: uint
  }
)

;; Events for UI indexing
(define-private (emit-event (event-type (string-ascii 50)) (game-id uint))
  (print {event: event-type, game-id: game-id, block: stacks-block-height})
)

;; ============================================
;; READ-ONLY HELPER FUNCTIONS
;; ============================================

;; Check if player is eliminated
(define-read-only (is-player-eliminated (game-id uint) (player principal))
  (default-to false 
    (get eliminated (map-get? player-game-data {game-id: game-id, player: player}))
  )
)

;; Get active players count
(define-read-only (get-active-players-count (game-id uint))
  (match (map-get? games game-id) 
    game
    (get count (fold count-active-player 
                     (get players game)
                     {game-id: game-id, count: u0}))
    u0
  )
)

;; Helper for counting active players
(define-private (count-active-player (player principal) (acc {game-id: uint, count: uint}))
  (if (not (is-player-eliminated (get game-id acc) player))
    {game-id: (get game-id acc), count: (+ (get count acc) u1)}
    acc
  )
)

;; Get game info
(define-read-only (get-game-info (game-id uint))
  (map-get? games game-id)
)

;; Check if prize has been claimed
(define-read-only (is-prize-claimed (game-id uint))
  (default-to false (map-get? prize-claimed game-id))
)

;; Get user leaderboard stats
(define-read-only (get-user-stats (user principal))
  (default-to 
    {games-played: u0, games-won: u0, total-winnings: u0, total-staked: u0}
    (map-get? user-stats user)
  )
)

;; Get player data for a game
(define-read-only (get-player-game-data (game-id uint) (player principal))
  (map-get? player-game-data {game-id: game-id, player: player})
)

;; Get total number of games
(define-read-only (get-total-games)
  (var-get game-counter)
)

;; Check if a user created a specific game
(define-read-only (is-game-creator (game-id uint) (user principal))
  (match (map-get? games game-id)
    game
    (is-eq (get creator game) user)
    false
  )
)

;; Check if a user is in a specific game
(define-read-only (is-user-in-game (game-id uint) (user principal))
  (match (map-get? games game-id)
    game
    (is-some (index-of (get players game) user))
    false
  )
)

;; Check if a game is active (not completed)
(define-read-only (is-game-active (game-id uint))
  (match (map-get? games game-id)
    game
    (< (get status game) STATUS-COMPLETED)
    false
  )
)

;; ============================================
;; GAME MANAGEMENT FUNCTIONS
;; ============================================

;; Create a new game (with host balance restriction)
(define-public (create-game (stake uint) (round-duration uint))
  (let ((id (+ (var-get game-counter) u1))
        (creator-balance (stx-get-balance tx-sender)))
    (begin
      ;; Validate inputs
      (asserts! (and (>= stake MIN-STAKE) (<= stake MAX-STAKE)) (err ERR-INVALID-STAKE))
      (asserts! (and (>= round-duration MIN-ROUND-DURATION) (<= round-duration MAX-ROUND-DURATION)) (err ERR-INVALID-DURATION))
      
      ;; Check host has minimum balance requirement
      (asserts! (>= creator-balance (+ MIN-HOST-BALANCE stake)) (err ERR-MIN-BALANCE-NOT-MET))
      
      ;; Transfer stake from creator
      (try! (stx-transfer? stake tx-sender (as-contract tx-sender)))
      
      ;; Update game counter
      (var-set game-counter id)
      
      ;; Create game
      (map-set games id
        {
          creator: tx-sender,
          players: (list tx-sender),
          stake: stake,
          prize-pool: stake,
          status: STATUS-CREATED,
          round-duration: round-duration,
          round-end: u0,
          current-round: u0,
          winner: none,
          total-rounds: u0
        })
      
      ;; Initialize creator's player data
      (map-set player-game-data {game-id: id, player: tx-sender}
        {
          eliminated: false,
          elimination-round: u0
        })
      
      ;; Track deposit
      (map-set player-deposits {game-id: id, player: tx-sender} stake)
      
      ;; Update user stats
      (update-user-stats-on-join tx-sender stake)
      
      (emit-event "game-created" id)
      (ok id)
    )
  )
)

;; Join an existing game
(define-public (join-game (game-id uint))
  (match (map-get? games game-id)
    game
    (begin
      ;; Validate game exists and is in correct state
      (asserts! (is-eq (get status game) STATUS-CREATED) (err ERR-INVALID-STATE))
      (asserts! (< (len (get players game)) MAX-PLAYERS) (err ERR-GAME-FULL))
      (asserts! (is-none (index-of (get players game) tx-sender)) (err ERR-UNAUTHORIZED))
      
      ;; Transfer stake
      (try! (stx-transfer? (get stake game) tx-sender (as-contract tx-sender)))
      
      ;; Update game with new player
      (map-set games game-id
        (merge game {
          players: (unwrap! (as-max-len? (append (get players game) tx-sender) u6) (err ERR-GAME-FULL)),
          prize-pool: (+ (get prize-pool game) (get stake game))
        }))
      
      ;; Initialize player data
      (map-set player-game-data {game-id: game-id, player: tx-sender}
        {
          eliminated: false,
          elimination-round: u0
        })
      
      ;; Track deposit
      (map-set player-deposits {game-id: game-id, player: tx-sender} (get stake game))
      
      ;; Update user stats
      (update-user-stats-on-join tx-sender (get stake game))
      
      (emit-event "player-joined" game-id)
      (ok true)
    )
    (err ERR-GAME-NOT-FOUND)
  )
)

;; Start the game (creator only, requires exactly 6 players)
(define-public (start-game (game-id uint))
  (match (map-get? games game-id)
    game
    (begin
      ;; Validate game state and permissions
      (asserts! (is-eq (get status game) STATUS-CREATED) (err ERR-INVALID-STATE))
      (asserts! (is-eq tx-sender (get creator game)) (err ERR-UNAUTHORIZED))
      (asserts! (is-eq (len (get players game)) MAX-PLAYERS) (err ERR-GAME-FULL))
      
      (map-set games game-id
        (merge game {
          status: STATUS-IN-PROGRESS,
          current-round: u1,
          round-end: (+ stacks-block-height (get round-duration game))
        }))
      
      (emit-event "game-started" game-id)
      (ok true)
    )
    (err ERR-GAME-NOT-FOUND)
  )
)

;; ============================================
;; SPIN MECHANICS (Core Gameplay)
;; ============================================

;; Spin the roulette (HOST ONLY, during active round)
(define-public (spin (game-id uint))
  (match (map-get? games game-id)
    game
    (begin
      ;; Validate caller is the host
      (asserts! (is-eq tx-sender (get creator game)) (err ERR-NOT-HOST))
      
      ;; Validate game is in progress
      (asserts! (is-eq (get status game) STATUS-IN-PROGRESS) (err ERR-INVALID-STATE))
      
      ;; Validate round is still active (within time window)
      (asserts! (<= stacks-block-height (get round-end game)) (err ERR-TIME-EXPIRED))
      
      ;; Get active players
      (let ((active-players (filter-active-players game-id (get players game))))
        ;; Ensure we have more than 1 player
        (asserts! (> (len active-players) u1) (err ERR-INVALID-STATE))
        
        ;; Select random player to eliminate using block hash
        (let ((victim (select-random-player active-players)))
          ;; Eliminate the victim
          (try! (eliminate-player game-id victim))
          
          (emit-event "player-eliminated" game-id)
          (ok victim)
        )
      )
    )
    (err ERR-GAME-NOT-FOUND)
  )
)

;; Filter active (non-eliminated) players
(define-private (filter-active-players (game-id uint) (players (list 6 principal)))
  (get active (fold filter-active-fold
        players
        {game-id: game-id, active: (list)}))
)

;; Helper to build active players list
(define-private (filter-active-fold (player principal) (acc {game-id: uint, active: (list 6 principal)}))
  (if (not (is-player-eliminated (get game-id acc) player))
    {
      game-id: (get game-id acc), 
      active: (unwrap! (as-max-len? (append (get active acc) player) u6) acc)
    }
    acc
  )
)

;; Select random player using block height as entropy
(define-private (select-random-player (players (list 6 principal)))
  (let (
    (player-count (len players))
    (pseudo-random (mod (+ stacks-block-height (var-get game-counter)) player-count))
  )
    (unwrap-panic (element-at players pseudo-random))
  )
)

;; Note: These helper functions are no longer needed with simplified randomness
;; but kept for potential future use with better entropy sources

;; ============================================
;; ROUND & ELIMINATION LOGIC
;; ============================================

;; Advance to next round (auto-called or manual trigger)
(define-public (advance-round (game-id uint))
  (match (map-get? games game-id)
    game
    (begin
      ;; Validate game is in progress
      (asserts! (is-eq (get status game) STATUS-IN-PROGRESS) (err ERR-INVALID-STATE))
      
      ;; Validate round has ended
      (asserts! (> stacks-block-height (get round-end game)) (err ERR-ROUND-NOT-ACTIVE))
      
      ;; Check if game should end (only 1 player left)
      (let ((active-count (get-active-players-count game-id)))
        (if (<= active-count u1)
          (complete-game game-id)
          (begin
            ;; Advance to next round
            (map-set games game-id
              (merge game {
                current-round: (+ (get current-round game) u1),
                round-end: (+ stacks-block-height (get round-duration game))
              }))
            
            (emit-event "round-advanced" game-id)
            (ok true)
          )
        )
      )
    )
    (err ERR-GAME-NOT-FOUND)
  )
)

;; Eliminate player
(define-private (eliminate-player (game-id uint) (player principal))
  (begin
    (match (map-get? player-game-data {game-id: game-id, player: player})
      player-data
      (map-set player-game-data {game-id: game-id, player: player}
        (merge player-data {
          eliminated: true,
          elimination-round: (get current-round (unwrap-panic (map-get? games game-id)))
        }))
      false
    )
    
    ;; Check if we have a winner (only 1 active player left)
    (let ((active-count (get-active-players-count game-id)))
      (if (is-eq active-count u1)
        (complete-game game-id)
        (ok true)
      )
    )
  )
)

;; Complete game and set winner
(define-private (complete-game (game-id uint))
  (match (map-get? games game-id)
    game
    (let ((winner-result (find-winner game-id (get players game)))
          (winner-principal (get winner winner-result)))
      (match winner-principal
        winner
        (begin
          (map-set games game-id
            (merge game {
              status: STATUS-COMPLETED,
              winner: (some winner),
              total-rounds: (get current-round game)
            }))
          
          (emit-event "game-completed" game-id)
          (ok true)
        )
        (err ERR-NO-WINNER)
      )
    )
    (err ERR-GAME-NOT-FOUND)
  )
)

;; Find the winner (the last non-eliminated player)
(define-private (find-winner (game-id uint) (players (list 6 principal)))
  (fold find-winner-fold
        players
        {game-id: game-id, winner: none})
)

;; Helper for finding winner
(define-private (find-winner-fold (player principal) (acc {game-id: uint, winner: (optional principal)}))
  (if (not (is-player-eliminated (get game-id acc) player))
    {game-id: (get game-id acc), winner: (some player)}
    acc
  )
)

;; ============================================
;; PRIZE CLAIMING & LEADERBOARD
;; ============================================

;; Claim winnings (winner only)
(define-public (claim-prize (game-id uint))
  (match (map-get? games game-id)
    game
    (begin
      ;; Validate game is completed
      (asserts! (is-eq (get status game) STATUS-COMPLETED) (err ERR-INVALID-STATE))
      
      ;; Validate winner exists
      (asserts! (is-some (get winner game)) (err ERR-NO-WINNER))
      
      ;; Validate caller is the winner
      (asserts! (is-eq tx-sender (unwrap! (get winner game) (err ERR-NOT-WINNER))) (err ERR-NOT-WINNER))
      
      ;; Check if prize already claimed
      (asserts! (is-none (map-get? prize-claimed game-id)) (err ERR-ALREADY-CLAIMED))
      
      ;; Mark prize as claimed
      (map-set prize-claimed game-id true)
      
      ;; Update winner stats
      (update-user-stats-on-win tx-sender (get prize-pool game))
      
      ;; Transfer prize pool from contract to winner
      (try! (as-contract (stx-transfer? (get prize-pool game) tx-sender (unwrap! (get winner game) (err ERR-NOT-WINNER)))))
      
      (emit-event "prize-claimed" game-id)
      (ok (get prize-pool game))
    )
    (err ERR-GAME-NOT-FOUND)
  )
)

;; Update user stats when joining a game
(define-private (update-user-stats-on-join (user principal) (stake uint))
  (let ((current-stats (get-user-stats user)))
    (map-set user-stats user
      {
        games-played: (+ (get games-played current-stats) u1),
        games-won: (get games-won current-stats),
        total-winnings: (get total-winnings current-stats),
        total-staked: (+ (get total-staked current-stats) stake)
      })
  )
)

;; Update user stats when winning a game
(define-private (update-user-stats-on-win (user principal) (winnings uint))
  (let ((current-stats (get-user-stats user)))
    (map-set user-stats user
      {
        games-played: (get games-played current-stats),
        games-won: (+ (get games-won current-stats) u1),
        total-winnings: (+ (get total-winnings current-stats) winnings),
        total-staked: (get total-staked current-stats)
      })
  )
)