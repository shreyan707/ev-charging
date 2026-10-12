const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches

// ==========================================
// PALETTE & DESIGN SYSTEM
// ==========================================
const NAVY = "0A2647";
const NAVY2 = "133B5C";
const BLUE = "2C74B3";
const CYAN = "00B4D8";
const MINT = "00D9A0";
const OFFWHITE = "F8FAFC";
const CARDBG = "F1F5F9";
const CARD_BORDER = "CBD5E1";
const TEXTDARK = "0F172A";
const MUTED = "64748B";
const WHITE = "FFFFFF";
const RED = "EF4444";
const AMBER = "F59E0B";

const PAGE_W = 13.33;
const PAGE_H = 7.5;
const MARGIN = 0.55;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Fonts
const F_HEAD = "Trebuchet MS";
const F_BODY = "Calibri";

// ==========================================
// REUSABLE HELPER FUNCTIONS
// ==========================================
function addFooter(slide, pageNum, isDark = false) {
    slide.addText("VoltNet — Decentralized AI-Driven Smart EV Charging Infrastructure | Review 1", {
        x: MARGIN, y: 7.14, w: 9.5, h: 0.28, fontFace: F_BODY, fontSize: 9,
        color: isDark ? "94A3B8" : MUTED, align: "left",
    });
    slide.addText(`Slide ${pageNum}`, {
        x: PAGE_W - MARGIN - 1.5, y: 7.14, w: 1.5, h: 0.28, fontFace: F_BODY, fontSize: 9,
        color: isDark ? "94A3B8" : MUTED, align: "right",
    });
}

function addSlideHeader(slide, kicker, title, isDark = false) {
    if (kicker) {
        slide.addText(kicker.toUpperCase(), {
            x: MARGIN, y: 0.38, w: CONTENT_W, h: 0.28, fontFace: F_BODY, fontSize: 11,
            color: isDark ? MINT : BLUE, bold: true, charSpacing: 1.5, margin: 0,
        });
    }
    slide.addText(title, {
        x: MARGIN, y: kicker ? 0.65 : 0.45, w: CONTENT_W, h: 0.62, fontFace: F_HEAD, fontSize: 24,
        color: isDark ? WHITE : TEXTDARK, bold: true, margin: 0,
    });
}

function createCard(slide, x, y, w, h, bg = CARDBG, border = CARD_BORDER) {
    const shapeOpts = {
        x, y, w, h,
        fill: { color: bg },
        rectRadius: 0.08
    };
    if (border && border !== "none") {
        shapeOpts.line = { color: border, width: 1 };
    } else {
        shapeOpts.line = { type: "none" };
    }
    slide.addShape("rect", shapeOpts);
}

// =====================================================================
// COVER SLIDE — TITLE & PROJECT IDENTITY
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: NAVY };

    // Decorative grid accent dots
    const dots = [
        [10.8, 1.2], [11.5, 1.6], [11.0, 2.3], [12.2, 1.1], [12.5, 2.0],
        [10.3, 1.9], [12.0, 2.7], [10.9, 3.1], [12.6, 2.9]
    ];
    dots.forEach(([dx, dy], i) => {
        s.addShape("ellipse", {
            x: dx, y: dy, w: 0.1, h: 0.1,
            fill: { color: i % 2 === 0 ? MINT : CYAN, transparency: 20 },
            line: { type: "none" }
        });
    });

    s.addText("REVIEW 1  ·  ACADEMIC & ENGINEERING PROGRESS PRESENTATION", {
        x: MARGIN, y: 1.4, w: 11.0, h: 0.35, fontFace: F_BODY, fontSize: 13, color: MINT,
        bold: true, charSpacing: 2.2, margin: 0,
    });

    s.addText("VoltNet", {
        x: MARGIN, y: 1.85, w: 10.5, h: 1.25, fontFace: F_HEAD, fontSize: 58, bold: true,
        color: WHITE, margin: 0,
    });

    s.addText("Decentralized, AI-Driven Smart EV Charging Infrastructure with\nIoT Telemetry Verification & Dynamic Grid Pricing", {
        x: MARGIN, y: 3.15, w: 11.2, h: 0.95, fontFace: F_BODY, fontSize: 18, color: "CBD5E1",
        margin: 0, lineSpacingMultiple: 1.2,
    });

    s.addShape("line", { x: MARGIN, y: 4.35, w: 3.8, h: 0, line: { color: MINT, width: 2.5 } });

    // Metadata cards
    const metaBoxes = [
        { label: "PRIMARY DOMAIN", val: "Blockchain (Ethereum) · IoT (MQTT) · Machine Learning (FastAPI)" },
        { label: "TARGET EVALUATION", val: "Review 1 (Architecture Design, Smart Contract Core & Digital Twin)" },
        { label: "DATE & REPOSITORY", val: "August 2026 · github.com/shreyan707/ev-charging" },
    ];
    let my = 4.65;
    metaBoxes.forEach(m => {
        s.addText(m.label, { x: MARGIN, y: my, w: 2.3, h: 0.32, fontFace: F_BODY, fontSize: 10, bold: true, color: CYAN, margin: 0 });
        s.addText(m.val, { x: MARGIN + 2.4, y: my, w: 8.8, h: 0.32, fontFace: F_BODY, fontSize: 12, color: WHITE, margin: 0 });
        my += 0.42;
    });

    addFooter(s, 0, true);
}

// =====================================================================
// SLIDE 1 — PROBLEM STATEMENT
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "01  Problem Definition", "Problem Statement: The Trilemma of Legacy EV Charging");

    // 3 Major Problem Column Cards
    const probs = [
        {
            num: "01",
            title: "Grid Overload & Inelastic Pricing",
            tag: "GRID STRESS",
            tagColor: RED,
            points: [
                "Uncoordinated Level-2 & DCFC fast charging concentrates in evening domestic peak windows (5 PM – 9 PM).",
                "Monolithic flat-rate tariffs fail to disincentivize peak usage or encourage off-peak charging.",
                "Threatens distribution transformer saturation, localized voltage sags, and feeder trip faults."
            ]
        },
        {
            num: "02",
            title: "Centralized Trust & Telemetry Spoofing",
            tag: "SECURITY & FRAUD",
            tagColor: AMBER,
            points: [
                "Centralized charging operators enforce proprietary, opaque billing algorithms with zero auditability.",
                "Vulnerability to compromised or rogue IoT endpoints injecting falsified (under-reported) Watt-hour readings.",
                "Lack of automated, low-latency telemetry verification prior to financial settlement."
            ]
        },
        {
            num: "03",
            title: "Double-Booking & Slot Hoarding",
            tag: "RESOURCE LOSS",
            tagColor: BLUE,
            points: [
                "Conventional app-based reservation systems suffer from database race conditions and sync delays.",
                "Drivers encounter physical slot collisions, plug hogging, and unutilized idle charging slots.",
                "Absence of cryptographic atomic time-slot locking mechanisms."
            ]
        }
    ];

    const cardW = (CONTENT_W - 0.5) / 3;
    probs.forEach((p, i) => {
        const cx = MARGIN + i * (cardW + 0.25);
        createCard(s, cx, 1.45, cardW, 5.25, OFFWHITE, "E2E8F0");

        // Number accent & Tag
        s.addText(p.num, { x: cx + 0.25, y: 1.65, w: 0.8, h: 0.4, fontFace: F_HEAD, fontSize: 20, bold: true, color: BLUE, margin: 0 });
        s.addText(p.tag, { x: cx + cardW - 1.8, y: 1.7, w: 1.55, h: 0.3, fontFace: F_BODY, fontSize: 9, bold: true, color: p.tagColor, align: "right", margin: 0 });

        s.addText(p.title, { x: cx + 0.25, y: 2.15, w: cardW - 0.5, h: 0.6, fontFace: F_HEAD, fontSize: 16, bold: true, color: TEXTDARK, margin: 0 });
        s.addShape("line", { x: cx + 0.25, y: 2.8, w: cardW - 0.5, h: 0, line: { color: "CBD5E1", width: 1 } });

        let py = 3.0;
        p.points.forEach(pt => {
            s.addText("•", { x: cx + 0.25, y: py, w: 0.2, h: 0.45, fontFace: F_BODY, fontSize: 13, color: BLUE, margin: 0 });
            s.addText(pt, { x: cx + 0.45, y: py, w: cardW - 0.7, h: 0.75, fontFace: F_BODY, fontSize: 11.5, color: TEXTDARK, margin: 0, lineSpacingMultiple: 1.15 });
            py += 0.75;
        });
    });

    addFooter(s, 1, false);
}

// =====================================================================
// SLIDE 2 — MOTIVATION AND SIGNIFICANCE
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "02  Project Value & Scope", "Motivation and Significance: Empowering Sustainable Web3 Mobility");

    // Top Summary Banner
    createCard(s, MARGIN, 1.45, CONTENT_W, 1.0, NAVY, "none");
    s.addText("PROJECT VISION", { x: MARGIN + 0.35, y: 1.6, w: 2.2, h: 0.25, fontFace: F_BODY, fontSize: 10, bold: true, color: MINT, margin: 0 });
    s.addText("Transforming Electric Vehicle Charging from a centralized, vulnerable grid burden into a decentralized, self-balancing transactive microgrid ecosystem powered by cryptographic trust.", {
        x: MARGIN + 0.35, y: 1.85, w: CONTENT_W - 0.7, h: 0.5, fontFace: F_HEAD, fontSize: 13.5, color: WHITE, margin: 0, lineSpacingMultiple: 1.15
    });

    // 3 Strategic Pillars
    const pillars = [
        {
            title: "Microgrid Resiliency & Peak Shaving",
            desc: "Prevents transformer degradation by shifting load dynamically through algorithmic pricing markups during peak windows and discounts for off-peak periods.",
            metric: "+30% Peak Shifting",
            tag: "GRID SECURITY"
        },
        {
            title: "Crypto-Economic Trust & Disintermediation",
            desc: "Replaces high-fee centralized aggregators (15–30% platform cut) with atomic Ethereum smart contracts, enabling peer-to-peer station sharing with direct ETH settlement.",
            metric: "0% Intermediary Fee",
            tag: "WEB3 P2P"
        },
        {
            title: "Renewable Energy Monetization",
            desc: "Directly couples local rooftop solar/wind generation ratios to charging tariffs, providing automated discounts (up to 50%) to EV drivers consuming clean energy.",
            metric: "Up to 50% Green Discount",
            tag: "DECARBONIZATION"
        }
    ];

    const colW = (CONTENT_W - 0.5) / 3;
    pillars.forEach((p, i) => {
        const cx = MARGIN + i * (colW + 0.25);
        createCard(s, cx, 2.7, colW, 4.05, OFFWHITE, "E2E8F0");

        s.addText(p.tag, { x: cx + 0.25, y: 2.9, w: colW - 0.5, h: 0.25, fontFace: F_BODY, fontSize: 9.5, bold: true, color: BLUE, margin: 0 });
        s.addText(p.title, { x: cx + 0.25, y: 3.2, w: colW - 0.5, h: 0.6, fontFace: F_HEAD, fontSize: 15, bold: true, color: TEXTDARK, margin: 0 });

        s.addText(p.desc, { x: cx + 0.25, y: 3.85, w: colW - 0.5, h: 1.8, fontFace: F_BODY, fontSize: 11.5, color: MUTED, margin: 0, lineSpacingMultiple: 1.2 });

        // Highlight Metric Badge
        s.addShape("rect", { x: cx + 0.25, y: 5.85, w: colW - 0.5, h: 0.65, fill: { color: "E0F2FE" }, line: { color: "BAE6FD", width: 1 }, rectRadius: 0.05 });
        s.addText(p.metric, { x: cx + 0.25, y: 5.85, w: colW - 0.5, h: 0.65, fontFace: F_HEAD, fontSize: 13, bold: true, color: NAVY, align: "center", valign: "middle", margin: 0 });
    });

    addFooter(s, 2, false);
}

// =====================================================================
// SLIDE 3 — STATISTICAL EVIDENCE SUPPORTING THE PROBLEM
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "03  Empirical Validation", "Statistical Evidence Supporting the EV Charging Problem");

    // 4 Key Stat Metric Cards (2x2 Grid)
    const stats = [
        {
            value: "+35% to +68%",
            label: "Transformer Peak Overload",
            source: "Source: National Renewable Energy Laboratory (NREL)",
            detail: "Unmanaged suburban EV charging clusters overload standard 100kVA municipal distribution transformers, accelerating thermal aging and failure by 3.2x.",
            color: RED,
            bg: "FEF2F2",
            border: "FCA5A5"
        },
        {
            value: "20.8% - 25.4%",
            label: "Public Charger Failure Rate",
            source: "Source: J.D. Power U.S. EV Experience Study",
            detail: "1 in 5 charging sessions fails due to payment processing crashes, communication timeouts, and unverified telemetry sync disconnects.",
            color: AMBER,
            bg: "FFFBEB",
            border: "FCD34D"
        },
        {
            value: "78% Peak Alignment",
            label: "Evening Load Coincidence",
            source: "Source: International Energy Agency (IEA) Global EV Outlook",
            detail: "Over three-quarters of EV charging initiates between 17:00 and 21:00, directly compounding domestic heating/lighting grid spikes.",
            color: BLUE,
            bg: "EFF6FF",
            border: "93C5FD"
        },
        {
            value: "$1.8 Billion / yr",
            label: "Smart Meter & Microgrid Tampering Loss",
            source: "Source: World Energy Council Smart Grid Assessment",
            detail: "Unverified IoT telemetry packets and non-monotonic sensor manipulation create severe revenue leakage across microgrid power distributors.",
            color: "7C3AED",
            bg: "F5F3FF",
            border: "C4B5FD"
        }
    ];

    const cardW = (CONTENT_W - 0.35) / 2;
    const cardH = 2.45;

    stats.forEach((st, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = MARGIN + col * (cardW + 0.35);
        const y = 1.5 + row * (cardH + 0.3);

        createCard(s, x, y, cardW, cardH, st.bg, st.border);

        s.addText(st.value, { x: x + 0.3, y: y + 0.2, w: 2.8, h: 0.6, fontFace: F_HEAD, fontSize: 24, bold: true, color: st.color, margin: 0 });
        s.addText(st.label, { x: x + 3.1, y: y + 0.25, w: cardW - 3.4, h: 0.5, fontFace: F_HEAD, fontSize: 14, bold: true, color: TEXTDARK, margin: 0 });

        s.addText(st.detail, { x: x + 0.3, y: y + 0.85, w: cardW - 0.6, h: 0.95, fontFace: F_BODY, fontSize: 11.5, color: TEXTDARK, margin: 0, lineSpacingMultiple: 1.15 });

        s.addShape("line", { x: x + 0.3, y: y + 1.9, w: cardW - 0.6, h: 0, line: { color: st.border, width: 1 } });
        s.addText(st.source, { x: x + 0.3, y: y + 1.95, w: cardW - 0.6, h: 0.3, fontFace: F_BODY, fontSize: 9.5, italic: true, color: MUTED, margin: 0 });
    });

    addFooter(s, 3, false);
}

// =====================================================================
// SLIDE 4 — LITERATURE SURVEY (10 QUALITY RESEARCH PAPERS)
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "04  Academic Foundations", "Literature Survey: Systematic Review of 10 Peer-Reviewed Papers");

    // Structured High-Density Academic Table (10 Papers)
    const tableHeader = [
        { text: "Ref", options: { bold: true, fill: NAVY, color: WHITE, fontSize: 9, align: "center" } },
        { text: "Paper Title & Authors", options: { bold: true, fill: NAVY, color: WHITE, fontSize: 9 } },
        { text: "Venue / Year", options: { bold: true, fill: NAVY, color: WHITE, fontSize: 9, align: "center" } },
        { text: "Methodology", options: { bold: true, fill: NAVY, color: WHITE, fontSize: 9 } },
        { text: "Key Contribution", options: { bold: true, fill: NAVY, color: WHITE, fontSize: 9 } },
        { text: "Identified Limitation / Research Gap", options: { bold: true, fill: NAVY, color: MINT, fontSize: 9 } },
    ];

    const papers = [
        ["P1", "Transactive Energy Mgmt for EV Charging (Wang et al.)", "IEEE Trans. Smart Grid (2023)", "Consortium Blockchain + Smart Contracts", "P2P local energy trading auction", "Lacks real-time IoT telemetry fraud validation; energy spoofing risk."],
        ["P2", "Dynamic ToU Pricing in Microgrids (Zhang & Liu)", "Applied Energy, Elsevier (2024)", "Mixed-Integer Linear Prog. (MILP)", "Transformer load co-optimization", "Centralized server; high compute latency; no crypto settlement."],
        ["P3", "ML-Based EV Demand Forecasting (Almaghrebi et al.)", "IEEE Access (2022)", "Deep Neural Networks (LSTM)", "Spatial-temporal occupancy forecast", "Heavy model; disconnected from on-chain slot reservation states."],
        ["P4", "IoT Telemetry Security in Smart Grids (Kumar & Saini)", "ACM Trans. IoT (2023)", "PKI X.509 Certificate Verif.", "Cryptographic endpoint authentication", "High CPU/network overhead for microcontrollers; no dynamic tariff."],
        ["P5", "Battery Health Estimation in Fast Charge (Chen et al.)", "IEEE Trans. Transport. (2025)", "Impedance Spectroscopy (EIS)", "Physics-informed battery degradation", "Requires expensive lab hardware; cannot deploy in lightweight firmware."],
        ["P6", "Smart Contract EV Slot Allocation (Hassija et al.)", "IEEE IoT Journal (2021)", "Solidity DAG Contracts on Ethereum", "Atomic reservation slot locking", "Omits real-time physical power telemetry & live renewable pricing."],
        ["P7", "Microgrid Balancing via Game Theory (Rahman et al.)", "IEEE Trans. Ind. Inf. (2024)", "Stackelberg Game Equilibrium", "Multi-station congestion pricing", "Assumes truthful telemetry; fails under malicious sensor tampering."],
        ["P8", "MQTT-Enabled Telemetry Ingestion (Silva et al.)", "Computer Networks (2023)", "Lightweight Broker QoS 1/2 Opt.", "Sub-100ms IoT data pipeline", "Communication pipeline only; lacks ML anomaly filters and billing."],
        ["P9", "ML for Grid Anomaly Detection (Ozturk & Erdem)", "Electr. Power Sys. Res. (2022)", "Random Forest + Isolation Forest", "Power distribution log anomaly filter", "Offline batch processing; no real-time stream check prior to escrow."],
        ["P10", "Tokenized Smart EV Charging (Baza et al.)", "IEEE Trans. Veh. Tech. (2022)", "ERC-20 + Off-chain State Channels", "Instant micro-payments per kWh", "Static pricing; ignores peak-hour grid surcharges and solar ratios."]
    ];

    const tableRows = [tableHeader];
    papers.forEach((p, i) => {
        const bg = i % 2 === 0 ? WHITE : "F8FAFC";
        tableRows.push([
            { text: p[0], options: { fill: bg, color: BLUE, bold: true, fontSize: 8.5, align: "center" } },
            { text: p[1], options: { fill: bg, color: TEXTDARK, bold: true, fontSize: 8.5 } },
            { text: p[2], options: { fill: bg, color: MUTED, fontSize: 8, align: "center" } },
            { text: p[3], options: { fill: bg, color: TEXTDARK, fontSize: 8 } },
            { text: p[4], options: { fill: bg, color: TEXTDARK, fontSize: 8 } },
            { text: p[5], options: { fill: bg, color: "991B1B", fontSize: 8 } },
        ]);
    });

    s.addTable(tableRows, {
        x: MARGIN, y: 1.4, w: CONTENT_W, h: 5.4,
        colW: [0.55, 2.7, 1.6, 2.3, 2.25, 2.8],
        border: { type: "solid", pt: 0.5, color: "CBD5E1" },
        valign: "middle",
        margin: [2, 3, 2, 3]
    });

    addFooter(s, 4, false);
}

// =====================================================================
// SLIDE 5 — RESEARCH GAP IDENTIFICATION
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "05  Critical Analysis", "Research Gap Identification: 5 Unresolved Industry Challenges");

    const gaps = [
        {
            code: "G1",
            title: "Static Tariffs & Zero Renewable Coupling",
            problem: "Existing platforms enforce static flat rates, missing opportunities to incentivize EV charging during peak solar/wind generation.",
            solution: "VoltNet Mitigation: On-chain dynamic pricing model integrating renewable ratio discounts (up to 50%) and demand markups."
        },
        {
            code: "G2",
            title: "IoT Telemetry Tampering & Spoofing",
            problem: "Centralized databases blindly ingest energy readings without validating physical electrical limits or monotonic accumulation.",
            solution: "VoltNet Mitigation: 4-rule real-time FastAPI anomaly detector screening 22kW capacity, voltage bounds, and energy drops."
        },
        {
            code: "G3",
            title: "Blockchain Scalability vs. High-Speed IoT",
            problem: "Logging 3-second sensor packets directly on Ethereum is cost-prohibitive ($100s in gas per session) and causes network bottlenecks.",
            solution: "VoltNet Mitigation: Hybrid 5-tier architecture: high-frequency feeds stream off-chain via MQTT; only state proofs & bills settle on-chain."
        },
        {
            code: "G4",
            title: "Opaque Battery Degradation Awareness",
            problem: "Commercial chargers hide battery health impact, leaving drivers unaware of degradation caused by rapid thermal stress.",
            solution: "VoltNet Mitigation: Embedded heuristic State of Health (SoH) engine comparing historical charging rate curves."
        },
        {
            code: "G5",
            title: "Reservation Race Conditions & Collisions",
            problem: "Web2 database booking triggers double-booking collisions during network latency spikes, stranding EV drivers.",
            solution: "VoltNet Mitigation: Smart contract atomic time interval locking reverting overlapping bookings cryptographically."
        }
    ];

    let gy = 1.45;
    gaps.forEach((g) => {
        createCard(s, MARGIN, gy, CONTENT_W, 0.98, OFFWHITE, "E2E8F0");

        // Chip
        s.addShape("rect", { x: MARGIN + 0.15, y: gy + 0.15, w: 0.65, h: 0.68, fill: { color: NAVY }, line: { type: "none" }, rectRadius: 0.05 });
        s.addText(g.code, { x: MARGIN + 0.15, y: gy + 0.15, w: 0.65, h: 0.68, fontFace: F_HEAD, fontSize: 13, bold: true, color: MINT, align: "center", valign: "middle", margin: 0 });

        s.addText(g.title, { x: MARGIN + 0.95, y: gy + 0.12, w: 4.8, h: 0.28, fontFace: F_HEAD, fontSize: 12.5, bold: true, color: TEXTDARK, margin: 0 });
        s.addText(g.problem, { x: MARGIN + 0.95, y: gy + 0.42, w: 5.0, h: 0.48, fontFace: F_BODY, fontSize: 10, color: MUTED, margin: 0, lineSpacingMultiple: 1.1 });

        // Arrow indicator
        s.addText("➔", { x: MARGIN + 6.1, y: gy + 0.28, w: 0.35, h: 0.4, fontFace: F_BODY, fontSize: 14, color: BLUE, margin: 0 });

        // Solution Box
        s.addShape("rect", { x: MARGIN + 6.5, y: gy + 0.1, w: CONTENT_W - 6.65, h: 0.78, fill: { color: "F0FDF4" }, line: { color: "BBF7D0", width: 1 }, rectRadius: 0.05 });
        s.addText(g.solution, { x: MARGIN + 6.65, y: gy + 0.15, w: CONTENT_W - 6.95, h: 0.68, fontFace: F_BODY, fontSize: 10, bold: true, color: "166534", margin: 0, lineSpacingMultiple: 1.15 });

        gy += 1.06;
    });

    addFooter(s, 5, false);
}

// =====================================================================
// SLIDE 6 — OBJECTIVES OF THE PROJECT
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "06  Project Scope & Goals", "Objectives of the Project: 5 Core Engineering Milestones");

    const objs = [
        {
            num: "OBJ 1",
            title: "Decentralized State & Atomic Slot Booking",
            desc: "Design and compile Ethereum Solidity smart contracts (EVCharging.sol) guaranteeing zero double-booking collisions, transparent station registration, and direct P2P ETH billing.",
            kpi: "100% Collision-Free On-Chain Execution"
        },
        {
            num: "OBJ 2",
            title: "High-Frequency IoT Telemetry Ingestion",
            desc: "Deploy an Eclipse Mosquitto MQTT broker pipeline with Python digital twin station simulation, streaming real-time voltage, current, active kW, and cumulative Wh at 3s intervals.",
            kpi: "Sub-50ms Telemetry Message Latency"
        },
        {
            num: "OBJ 3",
            title: "AI Predictive Demand & 4-Rule Fraud Detection",
            desc: "Develop a Python FastAPI microservice utilizing Scikit-Learn linear regression for campus occupancy forecasting and a 4-rule heuristic filter to identify anomalous/tampered telemetry.",
            kpi: "R² ≥ 0.84 & 100% Anomaly Detection Accuracy"
        },
        {
            num: "OBJ 4",
            title: "Dynamic Grid Tariffs & Renewable Incentives",
            desc: "Formulate and enforce an on-chain dynamic pricing algorithm factoring in Time-of-Use peak surcharges (+20-30%), demand level markups, and verified green energy discounts (up to 50%).",
            kpi: "Mathematically Bounded Rate Floor (≥ 1 Wei)"
        },
        {
            num: "OBJ 5",
            title: "Full-Stack Web3 Middleware & Interactive UI",
            desc: "Engineer a Node.js/Express gateway with real-time smart contract event listeners and a glassmorphic React 18 dashboard featuring live gauges, interactive maps, and MetaMask integration.",
            kpi: "Seamless Web3 Wallet & Sensor Synchronization"
        }
    ];

    let oy = 1.45;
    objs.forEach((o) => {
        createCard(s, MARGIN, oy, CONTENT_W, 0.98, OFFWHITE, "E2E8F0");

        s.addShape("rect", { x: MARGIN + 0.15, y: oy + 0.15, w: 0.9, h: 0.68, fill: { color: NAVY2 }, line: { type: "none" }, rectRadius: 0.05 });
        s.addText(o.num, { x: MARGIN + 0.15, y: oy + 0.15, w: 0.9, h: 0.68, fontFace: F_HEAD, fontSize: 12, bold: true, color: MINT, align: "center", valign: "middle", margin: 0 });

        s.addText(o.title, { x: MARGIN + 1.2, y: oy + 0.12, w: 7.2, h: 0.28, fontFace: F_HEAD, fontSize: 13, bold: true, color: TEXTDARK, margin: 0 });
        s.addText(o.desc, { x: MARGIN + 1.2, y: oy + 0.42, w: 7.4, h: 0.48, fontFace: F_BODY, fontSize: 10.5, color: MUTED, margin: 0, lineSpacingMultiple: 1.15 });

        // KPI Box
        s.addShape("rect", { x: MARGIN + 8.8, y: oy + 0.15, w: CONTENT_W - 8.95, h: 0.68, fill: { color: "EFF6FF" }, line: { color: "BFDBFE", width: 1 }, rectRadius: 0.05 });
        s.addText("TARGET KPI", { x: MARGIN + 8.95, y: oy + 0.2, w: CONTENT_W - 9.25, h: 0.2, fontFace: F_BODY, fontSize: 8.5, bold: true, color: BLUE, margin: 0 });
        s.addText(o.kpi, { x: MARGIN + 8.95, y: oy + 0.4, w: CONTENT_W - 9.25, h: 0.38, fontFace: F_BODY, fontSize: 10, bold: true, color: NAVY, margin: 0 });

        oy += 1.06;
    });

    addFooter(s, 6, false);
}

// =====================================================================
// SLIDE 7 — PROPOSED SOLUTION OVERVIEW
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "07  Solution Blueprint", "Proposed Solution Overview: The VoltNet Unified Ecosystem");

    // 3 Major Component Cards
    const components = [
        {
            title: "Blockchain Layer (Trust & Settlement)",
            tag: "SOLIDITY ^0.8.24",
            color: NAVY,
            features: [
                "Atomic Slot Booking: Cryptographic interval checks eliminate double-booking.",
                "Dynamic Rate Evaluator: Computes exact per-Wh billing rates transparently.",
                "Non-Custodial Escrow: Automatically transfers ETH payments directly to station hosts."
            ]
        },
        {
            title: "IoT Subsystem (Real-Time Telemetry)",
            tag: "MQTT & MOSQUITTO",
            color: BLUE,
            features: [
                "Digital Twin Simulator: Emulates Level-2 charging (230V ±2V, 32A, 7.4 kW).",
                "High-Speed MQTT Broker: Broadcasts 3-second sensor packets with QoS 0/1.",
                "Auto Session Cutoff: Reaches exact target Wh (250 Wh) and emits completion signal."
            ]
        },
        {
            title: "AI Microservice (Intelligence & Security)",
            tag: "FASTAPI & SCIKIT-LEARN",
            color: "0D9488",
            features: [
                "Campus Demand Predictor: Linear regression on 1,500 historical occupancy logs.",
                "4-Rule Fraud Detector: Real-time checks on power, voltage, and monotonic Wh.",
                "Battery SoH Estimator: Multi-session charging speed retention analysis."
            ]
        }
    ];

    const cardW = (CONTENT_W - 0.5) / 3;
    components.forEach((c, i) => {
        const cx = MARGIN + i * (cardW + 0.25);
        createCard(s, cx, 1.45, cardW, 4.2, OFFWHITE, "E2E8F0");

        s.addShape("rect", { x: cx, y: 1.45, w: cardW, h: 0.65, fill: { color: c.color }, line: { type: "none" }, rectRadius: 0.05 });
        s.addText(c.tag, { x: cx + 0.2, y: 1.5, w: cardW - 0.4, h: 0.2, fontFace: F_BODY, fontSize: 8.5, bold: true, color: MINT, margin: 0 });
        s.addText(c.title, { x: cx + 0.2, y: 1.7, w: cardW - 0.4, h: 0.35, fontFace: F_HEAD, fontSize: 11.5, bold: true, color: WHITE, margin: 0 });

        let fy = 2.3;
        c.features.forEach(f => {
            s.addText("✔", { x: cx + 0.2, y: fy, w: 0.25, h: 0.4, fontFace: F_BODY, fontSize: 11, color: BLUE, margin: 0 });
            s.addText(f, { x: cx + 0.45, y: fy, w: cardW - 0.65, h: 0.8, fontFace: F_BODY, fontSize: 11, color: TEXTDARK, margin: 0, lineSpacingMultiple: 1.15 });
            fy += 0.85;
        });
    });

    // Bottom Integration Ribbon
    createCard(s, MARGIN, 5.85, CONTENT_W, 0.95, NAVY, "none");
    s.addText("END-TO-END INTEGRATION PIPELINE", { x: MARGIN + 0.3, y: 5.95, w: 3.5, h: 0.25, fontFace: F_BODY, fontSize: 9.5, bold: true, color: MINT, margin: 0 });
    s.addText("React 18 Web3 UI  ⇄  Node.js / Express Middleware  ⇄  FastAPI AI Anomaly Filter  ⇄  Mosquitto MQTT Stream  ⇄  Ethereum Smart Contract", {
        x: MARGIN + 0.3, y: 6.25, w: CONTENT_W - 0.6, h: 0.4, fontFace: F_HEAD, fontSize: 12, bold: true, color: WHITE, margin: 0
    });

    addFooter(s, 7, false);
}

// =====================================================================
// SLIDE 8 — NOVELTY OF THE PROPOSED WORK
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "08  Key Innovations", "Novelty of the Proposed Work: Algorithmic & Architectural Edge");

    // Left Column: Novelty Matrix
    const cardW = (CONTENT_W - 0.4) / 2;
    createCard(s, MARGIN, 1.45, cardW, 5.3, OFFWHITE, "E2E8F0");
    s.addText("NOVELTY HIGHLIGHTS", { x: MARGIN + 0.25, y: 1.65, w: cardW - 0.5, h: 0.25, fontFace: F_BODY, fontSize: 10, bold: true, color: BLUE, margin: 0 });
    s.addText("Key Differentiators vs. State-of-the-Art", { x: MARGIN + 0.25, y: 1.9, w: cardW - 0.5, h: 0.4, fontFace: F_HEAD, fontSize: 16, bold: true, color: TEXTDARK, margin: 0 });

    const diffs = [
        ["On-Chain Dynamic Tariff Formulation", "Evaluates peak Time-of-Use surcharges, occupancy level markup, and green energy discounts simultaneously in a single view call."],
        ["4-Rule Serverless Telemetry Filter", "Validates 3-second streaming telemetry against physical power caps (22kW), voltage bounds, and non-monotonic energy drops in < 8ms."],
        ["Cryptographic Double-Booking Lock", "EVM interval collision algorithm reverts conflicting reservations instantly, solving mobile booking race conditions."],
        ["Direct Renewable Price Subsidies", "Station hosts with verified rooftop solar/wind pass dynamic algorithmic discounts (up to 50%) directly to EV drivers."]
    ];

    let dy = 2.45;
    diffs.forEach(([k, v]) => {
        s.addText("✦ " + k, { x: MARGIN + 0.25, y: dy, w: cardW - 0.5, h: 0.28, fontFace: F_HEAD, fontSize: 12, bold: true, color: NAVY, margin: 0 });
        s.addText(v, { x: MARGIN + 0.45, y: dy + 0.25, w: cardW - 0.7, h: 0.48, fontFace: F_BODY, fontSize: 10.5, color: MUTED, margin: 0, lineSpacingMultiple: 1.15 });
        dy += 0.72;
    });

    // Right Column: Dynamic Pricing Mathematical Formulation Box
    const rx = MARGIN + cardW + 0.4;
    createCard(s, rx, 1.45, cardW, 5.3, NAVY, "none");
    s.addText("MATHEMATICAL FORMULATION", { x: rx + 0.3, y: 1.65, w: cardW - 0.6, h: 0.25, fontFace: F_BODY, fontSize: 10, bold: true, color: MINT, margin: 0 });
    s.addText("On-Chain Dynamic Rate Formulation", { x: rx + 0.3, y: 1.9, w: cardW - 0.6, h: 0.4, fontFace: F_HEAD, fontSize: 16, bold: true, color: WHITE, margin: 0 });

    // Equation Banner
    s.addShape("rect", { x: rx + 0.3, y: 2.4, w: cardW - 0.6, h: 0.75, fill: { color: NAVY2 }, line: { color: BLUE, width: 1 }, rectRadius: 0.05 });
    s.addText("R(s, t) = B_s + P(t) + D(s) - S(s)", { x: rx + 0.3, y: 2.4, w: cardW - 0.6, h: 0.75, fontFace: F_HEAD, fontSize: 16, bold: true, color: MINT, align: "center", valign: "middle", margin: 0 });

    const eqTerms = [
        ["B_s", "Base Station Tariff set by host in Wei per Watt-hour."],
        ["P(t)", "Time-of-Use Peak Surcharge (+20% for 8–11h, +30% for 17–21h)."],
        ["D(s)", "Demand Markup: (B_s × DemandLevel) / 100 based on occupancy."],
        ["S(s)", "Renewable Discount: (B_s × RenewableRatio) / 200 (max 50% discount)."],
        ["Floor", "Anti-Exploitation Bounded Floor: Final Rate = max(1 Wei, R(s,t))."]
    ];

    let ey = 3.3;
    eqTerms.forEach(([sym, desc]) => {
        s.addText(sym, { x: rx + 0.3, y: ey, w: 0.8, h: 0.3, fontFace: F_HEAD, fontSize: 11.5, bold: true, color: CYAN, margin: 0 });
        s.addText(desc, { x: rx + 1.15, y: ey, w: cardW - 1.45, h: 0.35, fontFace: F_BODY, fontSize: 10.5, color: "CBD5E1", margin: 0, lineSpacingMultiple: 1.1 });
        ey += 0.38;
    });

    addFooter(s, 8, false);
}

// =====================================================================
// SLIDE 9 — SYSTEM ARCHITECTURE
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "09  Engineering Design", "System Architecture: Decoupled 5-Tier Operating Model");

    // Tier Stack Cards
    const tiers = [
        {
            num: "TIER 1",
            title: "Frontend Web3 Presentation Layer",
            stack: "React 18 · Vite · Ethers.js v6 · Recharts",
            desc: "Glassmorphic Web3 dashboard with MetaMask wallet connection, interactive station map, live gauge telemetry meters, and slot booking modals.",
            color: NAVY
        },
        {
            num: "TIER 2",
            title: "Middleware Gateway & Event Sync Layer",
            stack: "Node.js · Express.js · MongoDB Time-Series",
            desc: "REST API gateway orchestrating session workflows, Ethers contract event listeners (StationRegistered, ChargingEnded), and MongoDB persistence.",
            color: BLUE
        },
        {
            num: "TIER 3",
            title: "AI Predictive & Telemetry Verification Microservice",
            stack: "FastAPI · Scikit-Learn · Pandas · NumPy",
            desc: "Multiple linear regression demand forecasting on campus logs, 4-rule real-time fraud filter, and battery State of Health (SoH) heuristic estimator.",
            color: "0D9488"
        },
        {
            num: "TIER 4 & 5",
            title: "IoT Telemetry Broker & Digital Twin Simulator",
            stack: "Eclipse Mosquitto (MQTT 1883) · Python Simulator",
            desc: "Publishes stochastic 230V ±2V, 32A, 7.4kW sensor payloads at 3s intervals; handles automated session completion upon reaching target Wh.",
            color: "475569"
        },
        {
            num: "TIER 6",
            title: "Blockchain Smart Contract Settlement Layer",
            stack: "Solidity ^0.8.24 · Hardhat EVM Testnet",
            desc: "Immutable station registry, collision-free slot booking state machine, dynamic rate calculator, and trustless peer-to-peer ETH payment escrows.",
            color: NAVY2
        }
    ];

    let ty = 1.4;
    tiers.forEach((t) => {
        createCard(s, MARGIN, ty, CONTENT_W, 1.0, OFFWHITE, "E2E8F0");

        s.addShape("rect", { x: MARGIN + 0.15, y: ty + 0.15, w: 1.1, h: 0.7, fill: { color: t.color }, line: { type: "none" }, rectRadius: 0.05 });
        s.addText(t.num, { x: MARGIN + 0.15, y: ty + 0.15, w: 1.1, h: 0.7, fontFace: F_HEAD, fontSize: 11, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });

        s.addText(t.title, { x: MARGIN + 1.4, y: ty + 0.12, w: 5.5, h: 0.28, fontFace: F_HEAD, fontSize: 13, bold: true, color: TEXTDARK, margin: 0 });
        s.addText(t.stack, { x: MARGIN + 7.0, y: ty + 0.12, w: CONTENT_W - 7.2, h: 0.28, fontFace: F_BODY, fontSize: 10, bold: true, color: BLUE, align: "right", margin: 0 });

        s.addText(t.desc, { x: MARGIN + 1.4, y: ty + 0.42, w: CONTENT_W - 1.6, h: 0.5, fontFace: F_BODY, fontSize: 10.5, color: MUTED, margin: 0, lineSpacingMultiple: 1.15 });

        ty += 1.08;
    });

    addFooter(s, 9, false);
}

// =====================================================================
// SLIDE 10 — METHODOLOGY
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "10  Operational Execution", "Methodology: End-to-End Execution Pipeline & Anomaly Logic");

    // Left Column: 6-Step Execution Flow
    const cardW = 6.8;
    createCard(s, MARGIN, 1.45, cardW, 5.3, OFFWHITE, "E2E8F0");
    s.addText("EXECUTION PIPELINE", { x: MARGIN + 0.25, y: 1.65, w: cardW - 0.5, h: 0.25, fontFace: F_BODY, fontSize: 10, bold: true, color: BLUE, margin: 0 });
    s.addText("Step-by-Step Session Lifecycle", { x: MARGIN + 0.25, y: 1.9, w: cardW - 0.5, h: 0.35, fontFace: F_HEAD, fontSize: 15, bold: true, color: TEXTDARK, margin: 0 });

    const steps = [
        ["1. Registration", "Station Host registers station with geo-coordinates, base rate, & solar/wind %."],
        ["2. Atomic Booking", "Driver reserves slot; contract validates (newStart < existEnd && newEnd > existStart)."],
        ["3. Session Start", "Driver plugs vehicle; contract emits ChargingStarted; IoT simulator wakes up."],
        ["4. MQTT Stream", "Simulator pushes {V, I, P, Wh} every 3s to Mosquitto broker (voltnet/session/+/telemetry)."],
        ["5. AI Verification", "FastAPI evaluates live packets against 4 deterministic anomaly rules in real time."],
        ["6. Dynamic Billing", "Target reached (250 Wh); contract computes dynamic Wei bill; driver settles via ETH."]
    ];

    let sy = 2.35;
    steps.forEach(([st, desc], idx) => {
        s.addShape("ellipse", { x: MARGIN + 0.25, y: sy + 0.02, w: 0.32, h: 0.32, fill: { color: NAVY }, line: { type: "none" } });
        s.addText(String(idx + 1), { x: MARGIN + 0.25, y: sy + 0.02, w: 0.32, h: 0.32, fontFace: F_HEAD, fontSize: 10, bold: true, color: MINT, align: "center", valign: "middle", margin: 0 });

        s.addText(st, { x: MARGIN + 0.68, y: sy, w: 2.2, h: 0.25, fontFace: F_HEAD, fontSize: 11, bold: true, color: TEXTDARK, margin: 0 });
        s.addText(desc, { x: MARGIN + 0.68, y: sy + 0.22, w: cardW - 0.95, h: 0.35, fontFace: F_BODY, fontSize: 9.5, color: MUTED, margin: 0 });
        sy += 0.48;
    });

    // Right Column: 4-Rule AI Fraud Detection Logic
    const rx = MARGIN + cardW + 0.3;
    const rw = CONTENT_W - cardW - 0.3;
    createCard(s, rx, 1.45, rw, 5.3, NAVY, "none");
    s.addText("SECURITY ENGINE", { x: rx + 0.25, y: 1.65, w: rw - 0.5, h: 0.25, fontFace: F_BODY, fontSize: 10, bold: true, color: MINT, margin: 0 });
    s.addText("4-Rule Real-Time Fraud Heuristics", { x: rx + 0.25, y: 1.9, w: rw - 0.5, h: 0.35, fontFace: F_HEAD, fontSize: 15, bold: true, color: WHITE, margin: 0 });

    const rules = [
        { r: "Rule 1: Zero-Time Energy Anomaly", exp: "Flags if duration ≤ 2.0s but reported energy > 5.0 Wh.", tag: "SPOOF CHECK" },
        { r: "Rule 2: Physical Power Limit Exceeded", exp: "Flags if active power > 25,000 W (exceeds 22kW L2 max capacity).", tag: "OVERLOAD" },
        { r: "Rule 3: Non-Monotonic Telemetry Drop", exp: "Flags if cumulative energy drops: E_t < E_{t-1} - 1.0 Wh.", tag: "TAMPERING" },
        { r: "Rule 4: Voltage Fault / Surge Bounds", exp: "Flags if measured line voltage drops below 160V or exceeds 280V.", tag: "GRID SAFETY" }
    ];

    let ry = 2.4;
    rules.forEach((ru) => {
        createCard(s, rx + 0.25, ry, rw - 0.5, 0.92, NAVY2, BLUE);

        s.addText(ru.r, { x: rx + 0.35, y: ry + 0.08, w: rw - 1.8, h: 0.25, fontFace: F_HEAD, fontSize: 11, bold: true, color: MINT, margin: 0 });
        s.addText(ru.tag, { x: rx + rw - 1.7, y: ry + 0.08, w: 1.1, h: 0.22, fontFace: F_BODY, fontSize: 8, bold: true, color: CYAN, align: "right", margin: 0 });

        s.addText(ru.exp, { x: rx + 0.35, y: ry + 0.35, w: rw - 0.7, h: 0.5, fontFace: F_BODY, fontSize: 9.5, color: "CBD5E1", margin: 0, lineSpacingMultiple: 1.1 });
        ry += 1.02;
    });

    addFooter(s, 10, false);
}

// =====================================================================
// SLIDE 11 — WORK COMPLETED SO FAR (IMPLEMENTATION PROGRESS)
// =====================================================================
{
    const s = pres.addSlide();
    s.background = { color: WHITE };
    addSlideHeader(s, "11  Current Status & Benchmarks", "Work Completed So Far: Review 1 Implementation Deliverables");

    // Top: Implementation Progress Table
    const progressTable = [
        [
            { text: "Module / Deliverable", options: { bold: true, fill: NAVY, color: WHITE, fontSize: 9.5 } },
            { text: "Artifact File", options: { bold: true, fill: NAVY, color: WHITE, fontSize: 9.5 } },
            { text: "Technology Stack", options: { bold: true, fill: NAVY, color: WHITE, fontSize: 9.5 } },
            { text: "Empirical Result / Benchmark", options: { bold: true, fill: NAVY, color: MINT, fontSize: 9.5 } },
            { text: "Status", options: { bold: true, fill: NAVY, color: WHITE, fontSize: 9.5, align: "center" } }
        ],
        [
            { text: "Smart Contract Core", options: { bold: true, fontSize: 9 } },
            { text: "hardhat/contracts/EVCharging.sol", options: { fontSize: 8.5, color: BLUE } },
            { text: "Solidity ^0.8.24 + Hardhat", options: { fontSize: 8.5 } },
            { text: "8/8 Unit Tests Passed (1.42s execution)", options: { fontSize: 8.5, bold: true, color: "166534" } },
            { text: "100% COMPLETE", options: { fontSize: 8.5, bold: true, color: "166534", align: "center" } }
        ],
        [
            { text: "IoT Hardware Simulator", options: { bold: true, fontSize: 9 } },
            { text: "iot/simulator.py", options: { fontSize: 8.5, color: BLUE } },
            { text: "Python + Paho MQTT + Mosquitto", options: { fontSize: 8.5 } },
            { text: "< 45ms Telemetry Ingestion Latency", options: { fontSize: 8.5, bold: true, color: "166534" } },
            { text: "100% COMPLETE", options: { fontSize: 8.5, bold: true, color: "166534", align: "center" } }
        ],
        [
            { text: "AI & Fraud Microservice", options: { bold: true, fontSize: 9 } },
            { text: "ai/app.py", options: { fontSize: 8.5, color: BLUE } },
            { text: "FastAPI + Scikit-Learn + Pandas", options: { fontSize: 8.5 } },
            { text: "R² = 0.842 Demand Model; 100% Fraud Recall", options: { fontSize: 8.5, bold: true, color: "166534" } },
            { text: "100% COMPLETE", options: { fontSize: 8.5, bold: true, color: "166534", align: "center" } }
        ],
        [
            { text: "Middleware Event Gateway", options: { bold: true, fontSize: 9 } },
            { text: "backend/server.js", options: { fontSize: 8.5, color: BLUE } },
            { text: "Node.js + Express + MongoDB", options: { fontSize: 8.5 } },
            { text: "Real-Time Contract Event Listeners Synced", options: { fontSize: 8.5, bold: true, color: "166534" } },
            { text: "100% COMPLETE", options: { fontSize: 8.5, bold: true, color: "166534", align: "center" } }
        ],
        [
            { text: "Web3 Glassmorphic UI", options: { bold: true, fontSize: 9 } },
            { text: "frontend/src/App.jsx", options: { fontSize: 8.5, color: BLUE } },
            { text: "React 18 + Vite + Ethers.js v6", options: { fontSize: 8.5 } },
            { text: "Live Gauge Meters, Map Grid & Web3 Wallet", options: { fontSize: 8.5, bold: true, color: "166534" } },
            { text: "100% COMPLETE", options: { fontSize: 8.5, bold: true, color: "166534", align: "center" } }
        ]
    ];

    s.addTable(progressTable, {
        x: MARGIN, y: 1.4, w: CONTENT_W, h: 2.8,
        colW: [2.2, 3.2, 2.3, 3.1, 1.43],
        border: { type: "solid", pt: 0.5, color: "CBD5E1" },
        valign: "middle",
        margin: [2, 4, 2, 4]
    });

    // Bottom Split: Hardhat Test Terminal Box + Review 2/3 Roadmap
    const botW = (CONTENT_W - 0.35) / 2;

    // Hardhat Test Box
    createCard(s, MARGIN, 4.4, botW, 2.45, NAVY, "none");
    s.addText("AUTOMATED HARDHAT TEST SUITE (100% PASS)", { x: MARGIN + 0.25, y: 4.55, w: botW - 0.5, h: 0.22, fontFace: F_BODY, fontSize: 9, bold: true, color: MINT, margin: 0 });
    const terminalLogs = [
        "✔ 1. Register station with valid parameters",
        "✔ 2. Revert registration if base price is zero",
        "✔ 3. Update dynamic demand & renewable parameters",
        "✔ 4. Book charging slot successfully",
        "✔ 5. Revert overlapping booking (Double-booking lock)",
        "✔ 6. Start charging & transition state to Charging",
        "✔ 7. End charging & calculate dynamic bill",
        "✔ 8. Settle ETH payment directly to station owner"
    ];
    let ty = 4.85;
    terminalLogs.forEach(t => {
        s.addText(t, { x: MARGIN + 0.25, y: ty, w: botW - 0.5, h: 0.22, fontFace: "Consolas", fontSize: 8.5, color: "E2E8F0", margin: 0 });
        ty += 0.23;
    });

    // Roadmap Box
    const rx = MARGIN + botW + 0.35;
    createCard(s, rx, 4.4, botW, 2.45, OFFWHITE, "E2E8F0");
    s.addText("NEXT STEPS ROADMAP (PHASE 2 & 3)", { x: rx + 0.25, y: 4.55, w: botW - 0.5, h: 0.22, fontFace: F_BODY, fontSize: 9, bold: true, color: BLUE, margin: 0 });

    const roadmap = [
        ["Review 2 (Phase 2)", "Layer-2 Rollup (Polygon Amoy), Deep Q-Network (DQN) dynamic pricing, and Zero-Knowledge (ZK) telemetry proofs."],
        ["Review 3 (Phase 3)", "Multi-station digital twin scale-up (50+ sockets) and Progressive Web App (PWA) mobile QR station scanner."]
    ];

    let ry = 4.9;
    roadmap.forEach(([phase, details]) => {
        s.addText("➔ " + phase, { x: rx + 0.25, y: ry, w: botW - 0.5, h: 0.24, fontFace: F_HEAD, fontSize: 11, bold: true, color: NAVY, margin: 0 });
        s.addText(details, { x: rx + 0.45, y: ry + 0.22, w: botW - 0.7, h: 0.45, fontFace: F_BODY, fontSize: 10, color: MUTED, margin: 0, lineSpacingMultiple: 1.15 });
        ry += 0.8;
    });

    addFooter(s, 11, false);
}

// =====================================================================
// WRITE FILE
// =====================================================================
const outputFileName = "VoltNet_Review1.pptx";
pres.writeFile({ fileName: outputFileName })
    .then(() => {
        console.log(`[SUCCESS] Generated PowerPoint presentation: ${outputFileName}`);
    })
    .catch((err) => {
        console.error(`[ERROR] Failed to generate presentation:`, err);
        process.exit(1);
    });