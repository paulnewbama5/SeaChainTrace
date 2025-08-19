;; SeaChainTrace Traceability NFT Contract
;; Clarity v2 (Stacks 2.1+)
;; Implements NFT minting, transfer, metadata updates with audit trails, admin controls, and compliance features for seafood traceability

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-NOT-OWNER u101)
(define-constant ERR-INVALID-TOKEN-ID u102)
(define-constant ERR-PAUSED u103)
(define-constant ERR-ZERO-ADDRESS u104)
(define-constant ERR-METADATA-FROZEN u105)
(define-constant ERR-INVALID-METADATA u106)
(define-constant ERR-AUDIT-LOG-FULL u107)
(define-constant ERR-NOT-VERIFIER u108)

;; Contract metadata
(define-constant CONTRACT-NAME "SeaChainTrace Traceability NFT")
(define-constant MAX-AUDIT-ENTRIES-PER-TOKEN u50) ;; Limit to prevent excessive storage

;; Admin and state variables
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var token-counter uint u0)
(define-data-var verifier principal tx-sender) ;; Separate verifier role for updates

;; Maps
(define-map token-owners uint principal) ;; token-id -> owner
(define-map token-metadata uint (string-utf8 1024)) ;; token-id -> JSON-like metadata string
(define-map token-audit-logs uint (list 50 { timestamp: uint, actor: principal, action: (string-ascii 64), details: (string-utf8 512) })) ;; token-id -> list of audit entries
(define-map metadata-frozen uint bool) ;; token-id -> frozen status (no more updates)

;; Trait for NFT compatibility (SIP-009 inspired)
(define-trait nft-trait (
  (transfer (uint principal principal) (response bool uint))
  (get-owner (uint) (response (optional principal) uint))
  (get-token-uri (uint) (response (optional (string-utf8 256)) uint))
))

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: is-verifier
(define-private (is-verifier)
  (is-eq tx-sender (var-get verifier))
)

;; Private helper: ensure-not-paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: ensure-owner (checks if sender owns the token)
(define-private (ensure-owner (token-id uint))
  (asserts! (is-eq (unwrap! (map-get? token-owners token-id) (err ERR-INVALID-TOKEN-ID)) tx-sender) (err ERR-NOT-OWNER))
)

;; Private helper: add-audit-entry
(define-private (add-audit-entry (token-id uint) (action (string-ascii 64)) (details (string-utf8 512)))
  (let ((current-log (default-to (list) (map-get? token-audit-logs token-id)))
        (new-entry { timestamp: block-height, actor: tx-sender, action: action, details: details }))
    (asserts! (< (len current-log) MAX-AUDIT-ENTRIES-PER-TOKEN) (err ERR-AUDIT-LOG-FULL))
    (map-set token-audit-logs token-id (append current-log new-entry))
  )
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Set verifier (admin only)
(define-public (set-verifier (new-verifier principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-verifier 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set verifier new-verifier)
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Mint new NFT (admin or verifier only)
(define-public (mint (recipient principal) (initial-metadata (string-utf8 1024)))
  (begin
    (asserts! (or (is-admin) (is-verifier)) (err ERR-NOT-AUTHORIZED))
    (ensure-not-paused)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> (len initial-metadata) u0) (err ERR-INVALID-METADATA))
    (let ((new-token-id (+ (var-get token-counter) u1)))
      (map-set token-owners new-token-id recipient)
      (map-set token-metadata new-token-id initial-metadata)
      (map-set metadata-frozen new-token-id false)
      (map-set token-audit-logs new-token-id (list { timestamp: block-height, actor: tx-sender, action: "mint", details: initial-metadata }))
      (var-set token-counter new-token-id)
      (print { event: "nft-minted", token-id: new-token-id, recipient: recipient })
      (ok new-token-id)
    )
  )
)

;; Transfer NFT
(define-public (transfer (token-id uint) (recipient principal))
  (begin
    (ensure-not-paused)
    (ensure-owner token-id)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (map-set token-owners token-id recipient)
    (add-audit-entry token-id "transfer" (concat (concat (concat "from: " (principal-to-string tx-sender)) " to: ") (principal-to-string recipient)))
    (print { event: "nft-transferred", token-id: token-id, from: tx-sender, to: recipient })
    (ok true)
  )
)

;; Update metadata (verifier only, if not frozen)
(define-public (update-metadata (token-id uint) (new-metadata (string-utf8 1024)))
  (begin
    (asserts! (is-verifier) (err ERR-NOT-VERIFIER))
    (ensure-not-paused)
    (asserts! (is-some (map-get? token-owners token-id)) (err ERR-INVALID-TOKEN-ID))
    (asserts! (not (default-to false (map-get? metadata-frozen token-id))) (err ERR-METADATA-FROZEN))
    (asserts! (> (len new-metadata) u0) (err ERR-INVALID-METADATA))
    (let ((old-metadata (unwrap! (map-get? token-metadata token-id) (err ERR-INVALID-TOKEN-ID))))
      (map-set token-metadata token-id new-metadata)
      (add-audit-entry token-id "metadata-update" (concat (concat "old: " old-metadata) (concat " new: " new-metadata)))
      (print { event: "metadata-updated", token-id: token-id })
      (ok true)
    )
  )
)

;; Freeze metadata (owner or verifier)
(define-public (freeze-metadata (token-id uint))
  (begin
    (ensure-not-paused)
    (asserts! (or (is-eq (unwrap! (map-get? token-owners token-id) (err ERR-INVALID-TOKEN-ID)) tx-sender) (is-verifier)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (default-to false (map-get? metadata-frozen token-id))) (err ERR-METADATA-FROZEN))
    (map-set metadata-frozen token-id true)
    (add-audit-entry token-id "freeze-metadata" "Metadata frozen permanently")
    (print { event: "metadata-frozen", token-id: token-id })
    (ok true)
  )
)

;; Burn NFT (owner only)
(define-public (burn (token-id uint))
  (begin
    (ensure-not-paused)
    (ensure-owner token-id)
    (map-delete token-owners token-id)
    (map-delete token-metadata token-id)
    (map-delete token-audit-logs token-id)
    (map-delete metadata-frozen token-id)
    (add-audit-entry token-id "burn" "Token burned")
    (print { event: "nft-burned", token-id: token-id })
    (ok true)
  )
)

;; Read-only: get owner
(define-read-only (get-owner (token-id uint))
  (ok (map-get? token-owners token-id))
)

;; Read-only: get metadata
(define-read-only (get-metadata (token-id uint))
  (ok (map-get? token-metadata token-id))
)

;; Read-only: get audit log
(define-read-only (get-audit-log (token-id uint))
  (ok (map-get? token-audit-logs token-id))
)

;; Read-only: is metadata frozen
(define-read-only (is-metadata-frozen (token-id uint))
  (ok (default-to false (map-get? metadata-frozen token-id)))
)

;; Read-only: get total tokens minted
(define-read-only (get-total-tokens)
  (ok (var-get token-counter))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: get verifier
(define-read-only (get-verifier)
  (ok (var-get verifier))
)

;; Read-only: check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Additional helper: principal-to-string (for audit logging)
(define-private (principal-to-string (p principal))
  (unwrap-panic (principal-to-ascii p))
)