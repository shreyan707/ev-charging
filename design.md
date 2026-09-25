# VoltNet — Brutalist Minimal Design System

## 0. Design Direction

**Product:** VoltNet Smart EV Charging Network  
**Current product:** React 19 + Vite + Ethers.js v6 + Lucide Icons + Vanilla CSS  
**Redesign:** Brutalist + minimal, replacing the current glassmorphism direction.

### Core idea

VoltNet should feel like an **industrial control terminal for an EV microgrid**, not a generic Web3 dashboard.

The visual language should communicate:

- **Physical infrastructure** — stations, charging power, queues, energy.
- **Operational clarity** — important values are immediately visible.
- **On-chain trust** — wallet, transaction and settlement states are explicit.
- **AI intelligence** — forecasts and battery diagnostics are useful signals, not decorative cards.
- **Brutalist confidence** — hard edges, strong typography, visible structure, minimal decoration.

The interface should be **functional first, visually distinctive second**.

---

# 1. Design Principles

## 1.1 No Glassmorphism

Remove:

- frosted-glass panels
- excessive blur
- floating translucent cards
- large gradients
- glowing borders
- decorative shadows

Replace them with:

- solid surfaces
- 1px / 2px borders
- hard rectangular modules
- strong alignment
- visible separators
- restrained color accents

## 1.2 Information Has a Hierarchy

Every screen should have three visual levels:

### Level 01 — Critical

Examples:

- Charging / available status
- Current power
- Energy delivered
- Total bill
- Wallet/network status
- Transaction state

Use the largest typography.

### Level 02 — Operational

Examples:

- Station queue
- Dynamic rate
- Demand markup
- Solar ratio
- Forecast
- Session duration

Use medium typography and compact modules.

### Level 03 — Supporting

Examples:

- Session ID
- Wallet address
- timestamps
- contract details
- historical information

Use smaller monospace text.

---

# 2. Visual Identity

## 2.1 Color System

Use a nearly monochrome foundation.

```css
:root {
  --bg: #f4f3ee;
  --surface: #ffffff;
  --surface-alt: #e9e8e2;

  --ink: #111111;
  --muted: #686862;

  --line: #111111;
  --line-soft: #b8b7b0;

  --accent: #c8ff00;
  --accent-dark: #91b800;

  --warning: #ffb000;
  --danger: #ff3b30;
  --success: #16803c;
  --info: #2457ff;

  --overlay: rgba(17, 17, 17, 0.06);
}
```

### Usage

- **Black / near-black:** primary typography, borders, major actions.
- **Off-white:** application background.
- **White:** content modules.
- **Acid green:** active state, AI highlight, charging state and primary accent.
- **Amber:** warning, demand surcharge, pending transaction.
- **Red:** fraud alert, failed transaction, unsafe telemetry.
- **Blue:** informational blockchain/network states.

Do not use all accent colors simultaneously. Most screens should remain monochrome with **one dominant accent**.

---

# 3. Typography

Use a highly legible grotesk/sans-serif for headings and a monospace font for technical data.

Recommended:

```css
font-family: "Inter", "Arial", sans-serif;
```

Technical values:

```css
font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
```

## Type Scale

| Element | Size | Weight |
|---|---:|---:|
| Page title | 48–64px | 800 |
| Section title | 24–32px | 800 |
| Module title | 16–20px | 700 |
| KPI | 32–56px | 800 |
| Body | 14–16px | 400 |
| Metadata | 11–13px | 500 |
| Technical data | 12–16px | 500 |

Headings should be compact and preferably uppercase where appropriate.

Example:

```text
LIVE GRID
STATION 04
CHARGING SESSION
SETTLEMENT
```

---

# 4. Layout System

## 4.1 Desktop

Use a rigid dashboard grid.

```text
┌─────────────────────────────────────────────────────────────────────┐
│ VOLTNET        NETWORK: LOCALHOST      WALLET      ADMIN / DRIVER │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SYSTEM STATUS                                                     │
│  08 STATIONS ONLINE      03 CHARGING      02 QUEUED      01 ALERT │
│                                                                     │
├───────────────────────────────┬─────────────────────────────────────┤
│                               │                                     │
│  CHARGING STATIONS             │  ACTIVE SESSION                    │
│                               │                                     │
│  STATION 01                    │  SESSION #0042                      │
│  AVAILABLE                     │  STATION 03                         │
│  7.2 kW                        │  CHARGING                           │
│                               │                                     │
│  STATION 02                    │  32.1 A     230 V                  │
│  CHARGING                      │  7.38 kW    184 Wh                 │
│                               │                                     │
│  STATION 03                    │  [ TELEMETRY GRAPH ]               │
│  QUEUED                        │                                     │
│                               │  [ END SESSION ]                     │
│  ...                           │                                     │
│                               ├─────────────────────────────────────┤
│                               │  BILL / BATTERY / AI                │
│                               │                                     │
└───────────────────────────────┴─────────────────────────────────────┘
```

Recommended proportions:

- Header: 64px
- Main content: 12-column grid
- Station list: 7 columns
- Session/AI panel: 5 columns
- Gap: 16px
- Page padding: 24px desktop

## 4.2 Mobile

Collapse into:

1. Header
2. Network/wallet status
3. Active session
4. Stations
5. AI/battery information
6. Billing
7. History

Avoid horizontal scrolling except for deliberately technical tables.

---

# 5. Global Shell

## Header

The header should be extremely simple.

```text
VOLTNET
SMART EV GRID

LOCALHOST:8545  ●
0xf39F...2266
STATION ADMIN
```

### Logo

Use the Lucide `Zap` icon, but remove the glowing treatment.

The icon should be:

- black by default
- enclosed in a small square
- optionally inverted when the system is active

Example:

```text
┌────┐
│ ⚡ │ VOLTNET
└────┘
```

### Header rules

- No gradients.
- No floating glass.
- No oversized logo animation.
- Wallet address is monospace.
- Network status is always visible.
- Role is visible but compact.

---

# 6. Navigation

Navigation should be text-based.

```text
OVERVIEW
STATIONS
SESSIONS
ENERGY
AI
ADMIN
```

Active navigation:

```text
[ OVERVIEW ]
```

Use a solid black background with white text for the active item.

Do not use rounded pill navigation.

---

# 7. System Status Strip

Immediately below the header, show the health of the network.

```text
SYSTEM STATUS

08 / 08 STATIONS ONLINE
03 ACTIVE SESSIONS
02 QUEUED
01 AI ALERT
NETWORK  LOCALHOST:8545
CHAIN     HARDHAT
```

Each metric is a rectangular block separated by borders.

The strip should feel like an operations console.

---

# 8. Station Grid

The station grid is the primary driver interface.

Each station should be a **dense rectangular module**, not a floating card.

## Station Module

```text
STATION 04                                      ONLINE

AVAILABLE
7.20 kW MAX

RATE
0.0000012 ETH / Wh

DEMAND
+40%

SOLAR
90%

QUEUE
02 VEHICLES

AI FORECAST
MODERATE CONGESTION

[ BOOK SLOT ]
```

### Status states

#### Available

```text
● AVAILABLE
```

Use the green accent.

#### Charging

```text
■ CHARGING
```

Show current power prominently.

#### Queued

```text
▲ QUEUED
```

Show queue count.

#### Offline

```text
× OFFLINE
```

Use red.

---

# 9. Station Information Hierarchy

The most important station information should appear in this order:

1. Station ID
2. Availability
3. Current/maximum power
4. Rate
5. Queue
6. Demand markup
7. Solar ratio
8. AI forecast
9. Booking action

Avoid displaying every piece of information at equal visual weight.

---

# 10. Booking Flow

The booking interface should feel like a **transaction terminal**, not a traditional rounded modal.

## Booking Panel

```text
BOOK STATION 04
────────────────────────────

DATE
[ 25 SEP 2026 ]

START
[ 14:30 ]

DURATION
[ 30 MIN ]

CURRENT RATE
0.0000012 ETH / Wh

DEMAND MARKUP
+40%

SOLAR DISCOUNT
-15%

ESTIMATED COST
0.00482 ETH

────────────────────────────

[ CANCEL ]     [ CONFIRM BOOKING ]
```

### Dynamic price preview

The estimated price should update immediately when:

- station changes
- date changes
- start time changes
- duration changes
- demand changes

The price calculation is backed by:

```text
calculateRatePerWh(stationId, timestamp)
```

The interface should explicitly distinguish:

```text
ESTIMATE
```

from:

```text
FINAL ON-CHAIN AMOUNT
```

---

# 11. Transaction States

Every blockchain action should have a clear state.

## Idle

```text
CONFIRM BOOKING
```

## Wallet Confirmation

```text
WAITING FOR WALLET
Confirm transaction in MetaMask.
```

## Submitted

```text
TRANSACTION SUBMITTED
0x8af3...91c2
```

## Confirmed

```text
TRANSACTION CONFIRMED
BLOCK  #128
```

## Failed

```text
TRANSACTION FAILED
[ RETRY ]
```

Avoid vague loading animations.

Prefer explicit status text.

---

# 12. Active Charging Session

The active session should be the visual centerpiece for a driver.

```text
ACTIVE SESSION

SESSION #0042
STATION 04
CHARGING

07:42
ELAPSED

32.1 A
230 V
7.38 kW

ENERGY DELIVERED
184 Wh
████████████████░░░░  73%

CURRENT RATE
0.0000012 ETH / Wh

ESTIMATED BILL
0.00384 ETH
```

The power value should be the largest number.

---

# 13. Telemetry Visualization

Do not use decorative gauges.

Replace circular glassmorphic gauges with:

- horizontal progress bars
- compact line charts
- large numerical values
- grid-based telemetry tables

Example:

```text
POWER
7.38 kW
───────────────╸────

CURRENT
32.1 A

VOLTAGE
230 V

ENERGY
184 Wh
████████████████░░░░
```

If charts are required, use a simple black line on an off-white background with grid lines.

No chart gradients.

---

# 14. Battery Health / AI Panel

AI should be treated as an operational subsystem.

## Battery Health

```text
AI / BATTERY

STATE OF HEALTH

94.2 %
███████████████████░

STATUS
NORMAL

TREND
-0.8% / 100 SESSIONS

DIAGNOSTIC
Charging efficiency remains
within expected range.

[ VIEW ANALYSIS ]
```

The AI result should always include:

- metric
- status
- trend
- short explanation

Avoid making AI look magical or anthropomorphic.

---

# 15. AI Demand Forecast

Each station may expose:

```text
AI FORECAST

OCCUPANCY
78%

NEXT 30 MIN
HIGH DEMAND

RECOMMENDATION
EXPECT QUEUE FORMATION
```

Use factual operational language.

Avoid:

```text
AI thinks this station is busy!
```

Prefer:

```text
FORECAST: HIGH DEMAND
```

---

# 16. Fraud / Anomaly Alert

Fraud alerts must interrupt the visual hierarchy.

```text
┌─────────────────────────────────────────────────────────────┐
│ ALERT / TELEMETRY ANOMALY                                  │
│                                                             │
│ NON-MONOTONIC ENERGY READING DETECTED                      │
│ Session #0042                                               │
│                                                             │
│ Energy decreased between telemetry samples.                │
│                                                             │
│ [ VIEW TELEMETRY ]    [ DISMISS ]                          │
└─────────────────────────────────────────────────────────────┘
```

Use red only for genuine alerts.

Do not use red for ordinary secondary information.

---

# 17. Billing / Settlement

Billing should be a transaction-oriented panel.

```text
SETTLEMENT

SESSION
#0042

ENERGY
250 Wh

RATE
0.0000012 ETH / Wh

TOTAL
0.00482 ETH

STATUS
PAYMENT REQUIRED

[ PAY BILL ]
```

After payment:

```text
PAID

TX
0x9b82...44fe

FUNDS SETTLED
```

---

# 18. Admin Pricing Console

The admin interface should look like an infrastructure control panel.

```text
ADMIN / PRICING

STATION 01
─────────────────────────────────

DEMAND MARKUP
0 ───────────●──────── 200%
             40%

SOLAR RATIO
0 ─────────●────────── 100%
           70%

CURRENT RATE
0.0000012 ETH / Wh

[ APPLY TO CHAIN ]
```

## Important

Admin controls should clearly communicate that changes are **on-chain actions**.

Button:

```text
APPLY TO CHAIN
```

After submission:

```text
UPDATING SMART CONTRACT...
```

Then:

```text
ON-CHAIN UPDATE CONFIRMED
```

---

# 19. Admin Station Overview

Instead of eight large cards, use a compact table.

```text
STATION   STATUS      RATE       DEMAND   SOLAR   QUEUE
01        AVAILABLE   0.000001   +20%     80%     00
02        CHARGING    0.000001   +40%     90%     02
03        AVAILABLE   0.000001   +00%     65%     00
04        OFFLINE     —          —        —       —
```

This is more efficient for operators.

---

# 20. Role-Based Experience

## Driver

Prioritize:

1. Find station
2. Check availability
3. Check price
4. Book
5. Start charging
6. Monitor telemetry
7. Pay

Hide admin configuration.

## Station Admin

Prioritize:

1. Station health
2. Demand
3. Pricing
4. Renewable ratio
5. Queue
6. Active sessions
7. On-chain updates

The role should affect **information architecture**, not just color.

---

# 21. Buttons

Use rectangular buttons with no pill radius.

```css
button {
  border: 2px solid var(--ink);
  border-radius: 0;
  padding: 12px 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
```

### Primary

```text
[ BOOK SLOT ]
```

Black background, white text.

### Secondary

```text
[ VIEW DETAILS ]
```

White background, black border.

### Destructive

```text
[ CANCEL SESSION ]
```

Red text/border.

### Blockchain action

```text
[ APPLY TO CHAIN ]
```

Black with acid-green interaction state.

---

# 22. Inputs

Inputs should look like machine controls.

```text
START TIME

┌─────────────────────────┐
│ 14:30                   │
└─────────────────────────┘
```

Use:

- square corners
- strong borders
- high contrast
- no inner shadows
- no floating labels

Focus:

```css
outline: 3px solid var(--accent);
outline-offset: 2px;
```

---

# 23. Sliders

Admin sliders should be visually simple.

```text
DEMAND MARKUP

0%                              200%
│──────────────●────────────────│
               40%
```

The current value should be displayed directly below the slider.

---

# 24. Tables

Tables should be used whenever the user needs to compare multiple stations or sessions.

Use:

- black header
- white/off-white body
- 1px borders
- monospace technical values
- no zebra gradients

Example:

```text
┌────────┬───────────┬────────┬────────┬───────┐
│ STATION│ STATUS    │ POWER  │ SOLAR  │ QUEUE │
├────────┼───────────┼────────┼────────┼───────┤
│ 01     │ AVAILABLE │ —      │ 80%    │ 00    │
│ 02     │ CHARGING  │ 7.4 kW │ 90%    │ 02    │
│ 03     │ AVAILABLE │ —      │ 65%    │ 00    │
└────────┴───────────┴────────┴────────┴───────┘
```

---

# 25. Status Indicators

Use text + symbol.

Do not rely on color alone.

```text
● ONLINE
■ CHARGING
▲ QUEUED
! WARNING
× OFFLINE
✓ CONFIRMED
```

This improves accessibility and makes the UI feel more industrial.

---

# 26. Borders and Radius

Default:

```css
border-radius: 0;
```

Allowed:

- 0px everywhere by default
- 2px only where technically necessary

Avoid:

- 12px cards
- 16px cards
- 24px cards
- pill-shaped containers

The interface should feel constructed from panels rather than floating objects.

---

# 27. Shadows

Avoid conventional drop shadows.

Preferred separation:

```css
border: 1px solid #111;
```

For major elements:

```css
border: 2px solid #111;
```

Optional brutalist offset shadow:

```css
box-shadow: 4px 4px 0 #111;
```

Use sparingly for primary interactive elements.

---

# 28. Spacing

Use a strict 4px base unit.

```text
4
8
12
16
24
32
48
64
```

Recommended:

- Module padding: 16–24px
- Section gap: 24–32px
- Page padding: 24–40px
- Header height: 64px

Avoid excessive empty space.

---

# 29. Icons

Continue using Lucide Icons.

Rules:

- 16px for metadata
- 20px for buttons
- 24px for section headers
- 32px only for major system symbols

Do not use icons as decoration.

Every icon should communicate an action or state.

---

# 30. Motion

Motion should be functional.

Allowed:

- telemetry value updates
- progress transitions
- transaction state transitions
- station status changes
- subtle hover states

Avoid:

- continuous logo animation
- glowing effects
- floating cards
- excessive page transitions
- decorative particle effects

Recommended transition:

```css
transition: background 120ms ease,
            color 120ms ease,
            border-color 120ms ease;
```

---

# 31. Responsive Behavior

## Desktop ≥ 1200px

Use two-column dashboard:

```text
STATIONS                     SESSION / AI
7 columns                    5 columns
```

## Tablet 768–1199px

Use:

```text
STATIONS
SESSION
AI
```

with two-column station modules.

## Mobile < 768px

Use a single-column stack.

Primary order:

```text
NETWORK
ACTIVE SESSION
BOOK STATION
STATIONS
AI
BILLING
HISTORY
```

The active session should remain near the top.

---

# 32. Empty States

Keep empty states extremely simple.

```text
NO ACTIVE SESSION

Book a station to begin charging.

[ FIND A STATION ]
```

No illustrations required.

---

# 33. Loading States

Avoid generic skeleton-card overload.

Use direct system messages:

```text
LOADING STATION DATA...
```

or:

```text
FETCHING ON-CHAIN RATE...
```

or:

```text
WAITING FOR TELEMETRY...
```

The wording should tell the user what the application is doing.

---

# 34. Error States

Errors should be actionable.

Bad:

```text
Something went wrong.
```

Better:

```text
NETWORK MISMATCH

Expected:
LOCALHOST:8545

Connected:
SEPOLIA

[ SWITCH NETWORK ]
```

---

# 35. Web3-Specific UX

The application should make blockchain mechanics understandable without hiding them.

For each transaction show:

```text
ACTION
BOOK STATION

WALLET
0xf39F...2266

NETWORK
LOCALHOST:8545

STATUS
WAITING FOR CONFIRMATION
```

When successful:

```text
CONFIRMED
TX 0x8af3...91c2
```

Never show raw blockchain data without context.

---

# 36. Data Formatting

## Wallet

```text
0xf39F...2266
```

## Transaction

```text
0x8af3...91c2
```

## Energy

```text
184 Wh
```

## Power

```text
7.38 kW
```

## Current

```text
32.1 A
```

## Voltage

```text
230 V
```

## Percentage

```text
94.2%
```

## ETH

Use sufficient precision for technical values, but visually emphasize the user-relevant amount.

---

# 37. Page Architecture

## Driver Overview

```text
HEADER
↓
NETWORK STATUS
↓
ACTIVE SESSION
↓
STATION GRID
↓
AI BATTERY
↓
SESSION HISTORY
```

## Admin Overview

```text
HEADER
↓
NETWORK STATUS
↓
GRID SUMMARY
↓
STATION TABLE
↓
PRICING CONTROLS
↓
ACTIVE SESSIONS
↓
AI / ALERTS
```

---

# 38. Component Structure

Recommended React structure:

```text
src/
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx
│   │   ├── Header.jsx
│   │   ├── Navigation.jsx
│   │   └── StatusStrip.jsx
│   │
│   ├── stations/
│   │   ├── StationGrid.jsx
│   │   ├── StationCard.jsx
│   │   ├── StationStatus.jsx
│   │   └── BookingPanel.jsx
│   │
│   ├── sessions/
│   │   ├── ActiveSession.jsx
│   │   ├── Telemetry.jsx
│   │   ├── SessionHistory.jsx
│   │   └── Billing.jsx
│   │
│   ├── ai/
│   │   ├── DemandForecast.jsx
│   │   ├── BatteryHealth.jsx
│   │   └── FraudAlert.jsx
│   │
│   ├── admin/
│   │   ├── PricingConsole.jsx
│   │   └── StationTable.jsx
│   │
│   └── web3/
│       ├── WalletStatus.jsx
│       ├── TransactionStatus.jsx
│       └── NetworkStatus.jsx
│
├── styles/
│   ├── tokens.css
│   ├── globals.css
│   ├── layout.css
│   ├── components.css
│   └── responsive.css
```

---

# 39. State Architecture

The redesign must preserve the existing application behavior.

Important states:

```text
wallet
network
role
stations
selectedStation
booking
sessions
activeSession
telemetry
batteryHealth
demandForecast
fraudAlert
transaction
```

Do not redesign the backend contracts or API semantics solely for visual changes.

Existing integration points include:

```text
GET /api/stations
GET /api/ai/forecast/:stationId
GET /api/ai/battery-health/:user
GET /api/sessions/user/:user
GET /api/sessions/active/:id
POST /api/sessions/end
```

The redesign is primarily a **presentation and interaction architecture change**.

---

# 40. Existing Smart Contract Actions

The UI must preserve the existing contract actions:

```text
bookSlot(stationId, startTimeUnix, durationSeconds)

startCharging(sessionId)

endCharging(sessionId, energy)

payBill(sessionId)

updateStationPricing(stationId, demand, renewable)

calculateRatePerWh(stationId, timestamp)
```

Each action should map to an explicit UI state.

---

# 41. Visual Rules for AI

AI should never dominate the core charging workflow.

Priority:

```text
CHARGING / SAFETY
        ↓
PRICE / SESSION
        ↓
AI FORECAST
        ↓
AI DIAGNOSTICS
```

AI is a decision-support layer, not the primary product identity.

---

# 42. Visual Rules for Web3

Web3 should feel trustworthy and transparent.

Use:

```text
ON-CHAIN
CONFIRMED
PENDING
WALLET
NETWORK
TRANSACTION
```

Avoid:

```text
WEB3 MAGIC
DECENTRALIZED FUTURE
BLOCKCHAIN POWER
```

The product should communicate through actual system states rather than marketing language.

---

# 43. Brutalist Details

Use a few deliberate visual motifs:

### 1. Oversized section numbers

```text
01
STATIONS
```

### 2. Technical labels

```text
SYS / GRID / 004
```

### 3. Hard separators

```text
────────────────────────────────
```

### 4. Large numeric values

```text
7.38
kW
```

### 5. Monospace system metadata

```text
TX 0x8af3...91c2
BLOCK 128
LOCALHOST:8545
```

These details should create the identity without turning the interface into a gimmick.

---

# 44. Accessibility

Minimum requirements:

- WCAG-conscious contrast
- keyboard-accessible controls
- visible focus states
- status communicated through text and icons
- no color-only status indicators
- minimum 44px touch target for primary controls
- readable body text
- reduced-motion support

Respect:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 45. Dark Mode

Dark mode can be supported later, but should not be the primary visual direction.

If implemented:

```text
BACKGROUND  #111111
SURFACE     #1a1a1a
INK         #f4f3ee
LINE        #f4f3ee
ACCENT      #c8ff00
```

Maintain the same brutalist geometry.

---

# 46. Before → After

## Current

```text
Glassmorphism
Rounded cards
Blur
Glow
Gradient branding
Floating panels
Decorative gauges
```

## New

```text
Brutalist minimal
Square modules
Hard borders
Solid surfaces
Monochrome foundation
Grid layout
Numerical telemetry
Explicit system states
```

---

# 47. Agentic AI Implementation Instructions

When an agent implements this redesign:

## Phase 1 — Preserve

Do not break:

- wallet connection
- role detection
- station retrieval
- booking
- dynamic pricing
- charging lifecycle
- telemetry polling
- AI forecast
- battery health
- fraud detection
- bill payment
- admin pricing updates

## Phase 2 — Replace Visual System

Replace:

```text
glassmorphism
blur
gradients
rounded cards
glowing borders
decorative gauges
```

with:

```text
solid surfaces
hard borders
square geometry
strong typography
monospace technical data
compact modules
```

## Phase 3 — Rebuild Information Architecture

Driver:

```text
ACTIVE SESSION
→ STATIONS
→ BOOKING
→ AI
→ BILLING
```

Admin:

```text
SYSTEM STATUS
→ STATION TABLE
→ PRICING
→ ACTIVE SESSIONS
→ ALERTS
```

## Phase 4 — Validate

Test:

- Driver account loads driver UI.
- Admin account loads admin UI.
- Wallet switching works.
- Network mismatch is visible.
- Station availability is readable.
- Booking flow works.
- Dynamic price updates.
- MetaMask transaction state is visible.
- Telemetry updates without layout jumping.
- Completed sessions expose payment.
- Admin pricing updates clearly indicate on-chain submission.
- Mobile layout remains usable.

---

# 48. Final Design Rule

**Make VoltNet look like a piece of infrastructure.**

The interface should feel closer to:

```text
POWER GRID CONTROL PANEL
+
EV CHARGING TERMINAL
+
BLOCKCHAIN TRANSACTION CONSOLE
```

and less like:

```text
GENERIC WEB3 DASHBOARD
+
CRYPTO LANDING PAGE
+
GLASSMORPHIC SAAS UI
```

The final experience should be:

**minimal, dense, industrial, technical, readable, and unmistakably VoltNet.**
