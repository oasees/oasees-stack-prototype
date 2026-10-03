# Price of Anarchy and Algorithmic Monoculture in Typed-Decision Agent Systems

**Handover brief for an agent or researcher picking up this line of work.**
Prepared 2 Oct 2026 in the OASEES project (edge/IoT DAO with autonomous device agents). This document is self-contained: you do not need the original conversation.

### Status tags

| Tag | Meaning |
|---|---|
| **[V]** | Verified against the source: the paper text or abstract was opened and checked |
| **[V-abs]** | Verified from the arXiv abstract only |
| **[KST]** | A theorem from Kleinberg–Sinanaj–Tardos. Its assumptions must be re-checked in your setting |
| **[ours]** | New result. Proof sketch only, not peer-reviewed |
| **[num]** | Checked numerically with exact binomial computation |
| **[open]** | Conjecture or empirical question |

**What was read in full:** Gilbert et al. (liquid democracy under correlation) and the Kleinberg–Sinanaj–Tardos main text plus the appendix proof of their Lemma 1.
**Not read:** the KST appendix proofs of Thm 3, Thm 5 and the smoothness claim. **Verify these before relying on them.**

---

## 0. The idea in one paragraph

Agentic systems increasingly delegate small decisions (vote, book, route, approve) to **typed decision models**. These "System One" models, such as TypeSafe's **Jev** and the open-weights **Laya**, return calibrated probabilities over options you define instead of free text. When many agents ask the **same model** about the **same input**, they receive the **same answer**, so their decisions become perfectly correlated. We call this **algorithmic monoculture**. It is often individually rational, because the shared model is the most accurate single source. But it destroys the collective benefit of many independent decision-makers, and it creates a single point of failure and of injection.

The **Price of Anarchy (PoA)** quantifies how much collective welfare is lost when each agent chooses its advice source selfishly instead of optimally. This line of work:
- imports PoA results for monoculture from algorithmic game theory, mainly Kleinberg–Sinanaj–Tardos 2026 and Kleinberg–Raghavan 2021;
- connects them to correlated-voting theory (Gilbert et al. 2026, the Condorcet jury theorem);
- adds new results for **voting/governance** settings and for **incentive design**;
- proposes measuring all of it empirically with typed models, which make the advice explicit, cacheable and auditable.

---

## 1. Background concepts

### 1.1 Price of Anarchy and related notions
- **Game:** players choose strategies and get utilities. **Welfare** is usually the sum of utilities, but here sometimes a different objective, such as P(the collective decision is correct).
- **Nash equilibrium (NE):** no player gains by deviating unilaterally. **Dominant-strategy equilibrium (DSE):** each player's strategy is best regardless of what the others do.
- **PoA** = OPT welfare / worst-equilibrium welfare. **Price of Stability (PoS)** = OPT / best-equilibrium welfare.
- **Smoothness** (Roughgarden): a (λ, μ)-smooth game has PoA ≤ λ/(1−μ). This bound extends automatically to mixed and correlated equilibria, coarse correlated equilibria (CCE), and the time-averaged outcome of **no-regret learners**. That matters for agents that *learn* which source to trust.

### 1.2 Algorithmic monoculture
- **Kleinberg & Raghavan (PNAS 2021).** Firms hire from a shared pool. Each firm chooses either a shared, more accurate algorithmic ranking or its own, less accurate human evaluator. Choosing the algorithm can be **dominant**, yet welfare would be higher if everyone used their independent evaluator, because correlated errors make everyone chase and miss the same candidates.
- Related: **outcome homogenisation** (Bommasani et al., NeurIPS 2022, [2211.13972](https://arxiv.org/abs/2211.13972)) [V-abs], and empirical LLM error correlation (§3.3).

### 1.3 Common vs idiosyncratic advice
- A **common technology** gives *the same sample* to every agent that adopts it.
- An **idiosyncratic** technology gives each agent an independent sample.
- **Key insight from this work: commonality comes from shared *input* as much as from a shared *model*.**
  - A deterministic rule applied to the same public report is just as "common" as an LLM applied to it.
  - The same model applied to each agent's *private* evidence is *not* common.

### 1.4 Correlated voting
- The **Condorcet jury theorem** says majority accuracy → 1 as n grows, if voters are independent with competence > ½. **Correlation breaks this.**
- **Ladha (1992):** exchangeable correlation ρ. **Kish design effect:** effective N = N / (1 + (N−1)ρ). With ρ > 0, majority accuracy has a floor below 1.
- **Gilbert et al. (2026)** use a **common-signal** model:
  - a public signal s is revealed *after* delegation is fixed;
  - conditional on s, votes are independent with competence p_iˢ;
  - marginally, votes are correlated.

### 1.5 Typed decision models ("System One")
- **What they return:** typed answers.
  - **Choice:** one of the options you supply, with a probability for each.
  - **Score:** a position on a 2–10 level rubric.
  - **Noul:** P(yes).
- **Jev (TypeSafe):** hosted API `POST /v1/systemone`. Launched 15 Sep 2026; pinned version `jev-1.13.0`.
- **Laya (Convai Innovations):** open weights (Apache-2.0), ModernBERT-based. `laya-server` (github.com/nvkudva/laya-server) exposes **the same `/v1/systemone` API**, so the same code can target either model.
- **Why they matter here:**
  - Each decision is an explicit probability, so calibration and correlation are directly measurable.
  - Answers depend only on (model, state, questions), so they can be **cached and replayed**, which enables counterfactual welfare computation.
  - Decision records can be logged or anchored on-chain.

---

## 2. The bridging reduction [ours]

> **When k agents send the same input to the same typed model, they cast the same decision. That is exactly equivalent to delegating their k votes to one voter: the model.**

Consequences:
- **Liquid-democracy theory applies directly.** Adoption is delegation and the model is a sink of weight k. Monoculture is the extreme case of delegation: one sink of weight n, which maximises weight concentration W₂ = Σwᵢ².
- **On-chain realisation:** adopters `delegate()` their governance tokens to a *model-proxy signer* that votes the model's answer.
  - OpenZeppelin ERC20Votes delegation is **one hop, not transitive**.
  - Multi-hop delegation chains are therefore resolved off-chain, and each agent delegates directly to the final voter (the sink).
- **A model that is accurate in benign conditions but steerable under attack is Gilbert et al.'s "volatile voter"**, with a competence vector like (1, 0.4).

---

## 3. Relevant work

### 3.1 Core theory (the two foundations)

**[KST] Kleinberg, Sinanaj, Tardos, *Price of Anarchy of Algorithmic Monoculture*, [arXiv:2604.00444](https://arxiv.org/abs/2604.00444) [V].**

*Setting:*
- One-sided matching with common values; firms are called in a random order (Random Serial Dictatorship, RSD).
- Each firm picks an advice source from a common set A or its own idiosyncratic set Hᵢ. Access sets may be arbitrary and asymmetric.

*Results:*
- **Stochastic consistency (SC)**, roughly "a ranking is more likely to order any pair correctly than incorrectly", implies **PoA ≤ 2** (Thm 1). This is **tight** (Thm 4, 2 − O(1/n)).
- Without SC, PoA can be **Ω(n)**, even with a strict dominant strategy (Prop 5).
- **(1−δ)-SC** implies **PoA ≤ 1 + 1/(1−δ)²** (Thm 5).
- Schur-concave additive-noise rankings, which include i.i.d. log-concave noise, are SC (Thm 3). So are Mallows models with an inversion-increasing distance (Thm 2).
- If candidate values are **permutation-invariant**, following one's ranking is weakly dominant even when deviation is allowed (incentive compatibility, Prop 4).
- The game is **(1,1)-smooth**, so the bound extends to CCE and no-regret learning. **[Proof in the appendix, not verified by us.]**

**[GSSSY] Gilbert, Schmid, Schnell, Svoboda, Yeo, *Liquid democracy under vote correlation*, [arXiv:2608.16738](https://arxiv.org/abs/2608.16738) [V].**

*Setting:* the common-signal model of §1.4.

*Results:*
- **Averaging competence across signal states is unsafe.** Delegating by average competence can violate do-no-harm: in their example, direct voting → 1 while average-based delegation gives 0.7 (Prop 1). And a beneficial delegation may go to a voter with *lower* average competence (Prop 2).
- **Mechanisms:**
  - **Alg 1, conservative intersection:** delegate only to voters better by αᵦ in *every* state. Inherits the scalar guarantees statewise (Thm 1).
  - **Alg 2, confounded set with mixing λ:** acyclic via a potential function when α⁰α¹ > β⁰β¹, with positive expected margins.
  - **Alg 3, certified paths on bounded in-degree graphs:** acyclic, terminal improvement ≥ αᵦ − βᵦ, sink weight ≤ W_T = Σ_{t≤T} Δᵗ_in, explicit Hoeffding failure bound (Thm 3, Cor 2).
- **Finite-signal extension:** feasible if Σ_c β_c/(α_c + β_c) < 1 (Lemma 3).
- **Explicitly left open:** how to *learn* the favoured/confounded labels. This work fills that gap with on-chain decision records (P5 below).

**Kleinberg & Raghavan, *Algorithmic monoculture and social welfare*, PNAS 118(22), 2021.** The origin of the dominant-but-worse phenomenon. [cited via KST]

### 3.2 Correlated committees and LLM voters

| Work | Finding | Tag |
|---|---|---|
| Li & Hai, *State-dependent error correlations shape voting thresholds in committees of AI agents*, [2607.23931](https://arxiv.org/abs/2607.23931) | Gaussian-copula model + Sah–Stiglitz screening. Shared errors create a majority-vote error floor that persists as voters are added, and they shift the optimal approval threshold. Fitted on 174k votes from 28 LMs; R² 0.84 → 0.967 | [V-abs] |
| Kim et al., *Correlated Errors in LLMs*, ICML 2025, [2506.07962](https://arxiv.org/abs/2506.07962) | 350+ LLMs agree 60% of the time when both err. More accurate models are *more* correlated, even across providers | [V] |
| Kohli, *Nine Judges, Two Effective Votes*, [2605.29800](https://arxiv.org/abs/2605.29800) | 9 frontier judges ≈ 2 independent votes; the best single judge matches or beats the panel | [V] |
| Hossain et al., *Agreement Overstates Evidence*, [2609.22512](https://arxiv.org/abs/2609.22512) | Mean pairwise error correlation 0.21 → 10 judges ≈ 3.5 independent ones | [V-abs] |
| Li et al., *How Many Humans Are 32 LLM Judges Worth?*, [2609.21277](https://arxiv.org/abs/2609.21277) | Effective-N estimators (MSE-based vs spectral) differ by 1.7–1.9× | [V-abs] |
| Collina, Goel, Roth et al., *Delegating Authorization to Misaligned Agents*, [2609.15803](https://arxiv.org/abs/2609.15803) | Necessary and sufficient panel condition; a k-disapproval threshold rule is provably safe | [V-abs] |
| Kleinberg et al. / Bommasani et al. | Monoculture and homogenisation | [V-abs] |
| *Price of Anarchy of Algorithmic Monoculture* follow-ons: Peng & Garg (NeurIPS 2024, two-sided matching); Jagadeesan et al. (NeurIPS 2023, competing classifiers) | Other monoculture models whose PoA is open | cited via KST |
| DAO-AI, [2510.21117](https://arxiv.org/abs/2510.21117) | LLM voter matches DAO outcomes 92.5% of the time overall, but only **54.2% on contested proposals** | [V] |

### 3.3 Typed-decision-model literature (very recent; mostly unreviewed preprints)

| Work | Finding | Tag |
|---|---|---|
| Wu & Lim, *REFLEX with Jev*, [2609.26532](https://arxiv.org/abs/2609.26532) | Jev as a fast typed decision layer with escalation; about 72.7% fewer strong-model calls. Weaker with large action sets | [V] |
| Wu & Lim, *Decision Hijacking: Prompt Injection on Jev*, [2609.28613](https://arxiv.org/abs/2609.28613) | Injection shifts probabilities but rarely selects the attacker's target: 1.8% → 3.5% adaptive. Successes cluster at **small decision margins** | [V-abs] |
| Hu et al., *JevAdvBench*, [2609.31142](https://arxiv.org/abs/2609.31142) | Scores attacks against the model's own clean decision and re-run noise | [V-abs] |
| Li et al., *Do a Typed-Decision Model's Probabilities Obey the Probability Axioms?*, [2609.33209](https://arxiv.org/abs/2609.33209) | Jev's yes/not-yes pairs miss summing to 1 by 0.064 on average (coherence) | [V-abs] |
| Tang & Zheng, *Typed Decision Models: Early Evidence Audit*, [2609.32160](https://arxiv.org/abs/2609.32160) | No independent accuracy edge for typed readouts; gains are latency and cost. **14-item evaluation checklist: follow it** | [V-abs] |
| Rafe & Das, *Benchmarking System One models vs classifiers vs LMs*, [2610.00346](https://arxiv.org/abs/2610.00346) | Rankings depend on conditions; small trained classifiers are competitive when labelled data exists | [V-abs] |
| Zhong et al., *Arithmetic-dependent rejection bottleneck in Jev*, [2609.39496](https://arxiv.org/abs/2609.39496) | 99% correct when the right answer is present; **7% correct rejection when it is absent**. Keep numeric checks in code | [V-abs] |
| Jev docs (docs.typesafe.ai) | Jev itself warns that adversarial content in the state can move answers, and that it is weak at counting and dates | [V] |

### 3.4 Agents, blockchains and safety

| Work | Relevance | Tag |
|---|---|---|
| Cai et al., *Mind the Gap*, CCS 2026, [2609.13601](https://arxiv.org/abs/2609.13601) | DAO proposals whose description doesn't match what they execute. **Judge execution, not text** | [V] |
| Patlan et al., *Real AI Agents with Fake Memories* / *AI Agents in Cryptoland*, [2503.16248](https://arxiv.org/abs/2503.16248), ePrint 2025/526 | Context/memory injection in web3 agents | [V-abs] |
| PACE, [2608.17220](https://arxiv.org/abs/2608.17220); *Proof-Gated Signing*, [2610.00354](https://arxiv.org/abs/2610.00354); *Agent Flight Recorder*, [2609.01931](https://arxiv.org/abs/2609.01931) | Policy-attested execution; solver-checked transaction guards; anchored audit trails | [V-abs] |
| Practice | **Arbitrum / Event Horizon:** AI-agent delegation cut by 98.6% after legitimacy concerns. **NEAR** AI delegates (roadmap). **Optimism** AI-delegate mission requires confidence self-assessment. **Olas Governatooorr** (archived 2025) | from a research-agent report; spot-check before citing |

### 3.5 Calibration, abstention and delegation

| Work | Relevance | Tag |
|---|---|---|
| KnowNo, [2307.01928](https://arxiv.org/abs/2307.01928) | Conformal prediction to decide when to ask for help | [V-abs] |
| Conformal Social Choice, [2604.07667](https://arxiv.org/abs/2604.07667) | Conformal guarantees on group decisions | [V-abs] |
| Resilient liquid democracy, [2607.01730](https://arxiv.org/abs/2607.01730) | Robustness of delegation networks | from radar output, unread |
| *Minority Sentinel*, [2606.29270](https://arxiv.org/abs/2606.29270) | When to overturn majority votes in correlated LLM debates | [V-abs] |

---

## 4. Formal models

### 4.1 Allocation game (KST directly)
- n agents and m ≥ n resources with **common** values x ≥ 0.
- RSD order β. Each agent picks an advice source aᵢ ∈ A ∪ Hᵢ and takes the top available resource in its ranking (obedience-constrained).
- Utility = value of the resource obtained. Welfare SW = Σ utilities.
- **Typed-model instantiation:** a ranking = resources sorted by a Score or Noul answer, with ties broken uniformly at random.

### 4.2 Governance / voting game (our adaptation)
- n members and ground truth Y ∈ {0, 1}. Signal state s ∈ S (e.g. {benign, adversarial}) with prior π.
- Common model M has competence p_Mˢ, with ex-ante value p̄_M = Σ_s π_s p_Mˢ. Private sources have competence q, independent given s.
- k adopters cast identical ballots. **W(k)** = P(weighted majority correct).
- Member utility mixes individual and collective reward:

  **uᵢ = λ · 1[own vote correct] + (1 − λ) · W**,  with λ ∈ [0, 1].

  Welfare = W. Note that this is **not** the sum of utilities, so "PoA" here is a social-loss ratio in that sense.

---

## 5. Propositions catalogue

### Allocation (A)

| Id | Statement | Tag |
|---|---|---|
| A1 | PoA ≤ 2 under SC; arbitrary asymmetric access is allowed | [KST Thm 1] |
| A2 | The bound is tight: 2 − O(1/n) | [KST Thm 4] |
| A3 | Without SC, PoA = Ω(n), even with a strict dominant strategy | [KST Prop 5] |
| A4 | (1−δ)-SC ⇒ PoA ≤ 1 + 1/(1−δ)² | [KST Thm 5] |
| A5 | Permutation-invariant values ⇒ following one's ranking is weakly dominant (unconstrained RSD) | [KST Prop 4] |
| A6 | (1,1)-smooth ⇒ the bounds hold for CCE and no-regret learners | [KST; appendix proof unverified] |
| A7 | Typed Score rankings are SC if the answer noise is exchangeable with a Schur-concave joint density. Uniform tie-breaking (Score has 2–10 levels) should preserve SC | [ours: sketch; tie-breaking needs proof] |
| A8 | **Plackett–Luce with bias.** w_k = e^{(x_k + β·a_k)/σ}. Conditional ratio = Π_{t=i+1}^{j} (S_t + w_k)/(S_t + w_ℓ). With bias factor γ = e^{−β·Δa_max/σ}, 1 − δ ≥ γ^{m−1}. **The guaranteed bound degrades with catalogue size m.** Is this real or a worst-case artefact? | [ours: derived; empirical question open] |
| A9 | Near-common sources (correlated but not identical samples, e.g. a nondeterministic hosted model): does PoA ≤ 2 survive? KST's Lemma 1 uses identical-or-independent | [open] |
| A10 | The KR phenomenon (dominant but socially worse) beyond n = 2 with typed models: frequency and size | [open, empirical] |

### Governance (B, P)

| Id | Statement | Tag |
|---|---|---|
| **P1 phase transition** | One common model with adoption share c; private q > ½. As n → ∞, Pr[DAO correct \| s] → 1 if c < c\* and → p_Mˢ if c > c\*, where **c\* = 1 − 1/(2q)**. Finite-n failure bound when M is wrong: exp(−2((1−c)q − ½)²·n/(1−c)). Numeric example: q = 0.6, p_M^adv = 0.4, n = 401, c ∈ {0, 0.1, 0.2, 0.5} → W = {1.00, 0.975, 0.51, 0.40} | [ours: sketch] [num] |
| P2 | Fallacy of averaging for adoption: picking the model by average accuracy can violate do-no-harm (direct instance of GSSSY Prop 1) | [ours, from GSSSY] |
| **B1** | λ = 1 and p̄_M > q > ½: adopting is strictly dominant, so the DSE is monoculture. **Ex-ante PoA = OPT/p̄_M < 2** (supremum 2, never attained). **Statewise** PoAˢ = 1/p_Mˢ ≤ 1 + 1/(1−δ_s), **unbounded** under successful injection | [ours: sketch] |
| **B2 incentive collapse** | (a) A single member's effect on W is O(1/√n). [num]: sup·√n ≈ 0.112 is constant over n = 31–401 for q = 0.65, p_M = (0.95, 0.30), π_adv = 0.2. (b) Monoculture is an NE for every λ ≥ 0 and n ≥ 3. (c) Beyond **n₀ ≈ ((1−λ)·C / (λ·(p̄_M − q)))²**, monoculture is the **unique** NE. (d) Below n₀ a fragile good equilibrium sits just under c\* | [ours: sketch] [num] |
| B3 fix | **Pigouvian adoption tax** u_adopt = λ(p̄_M − κ·c_M) makes this a congestion/potential game with c_eq = (p̄_M − q)/κ. **κ > (p̄_M − q)/c\*** restores W → 1. A **hard cap** c̄ < c\* does the same. Both need **observable adoption**: on-chain delegation to a model-proxy, or attested decision records | [ours: sketch] [num] |
| B4 | No-regret learners: λ = 1 → monoculture at rate O(√(log K / T)); with the tax → the c_eq basin; λ = 0 can stall in the weak monoculture NE | [ours: sketch / open] |
| B5 | Asymmetric access, e.g. on-prem Laya only vs hosted Jev reachable | [open] |
| P5 certified labels | Learn GSSSY's labels from m on-chain records per state. Hoeffding with a union bound: ε = √(ln(4n/η)/(2m)). Label rules: favoured if Δp̂ ≥ α + 2ε; not confounded if −Δp̂ ≤ β − 2ε. GSSSY's guarantees then hold with probability ≥ 1 − η. **Assumes the signal state is observable ex post** | [ours: sketch] |

**B2 numeric check** (λ = 0.05; predicted n₀ ≈ 157):

| n | Equilibria (adopter count) | W at equilibrium | W(OPT) |
|---|---|---|---|
| 101 | {20, 101} | 0.945 (good one) | 0.999 |
| 401 | **{401} only** | 0.82 | 1.000 |

**B3 numeric check** (n = 401; threshold κ ≈ 0.74):

| κ | c_eq | W |
|---|---|---|
| 0.6 | 0.28 | 0.83 |
| 1.0 | 0.17 | **0.994** |

**Correction to earlier drafts.** The (1−δ) bound for voting is **statewise**. Ex ante, the PoA of the dominant-strategy equilibrium is automatically < 2 whenever private sources beat chance.

**Interpretive point worth making in any paper.** KST call PoA ≤ 2 "reassuring" for matching. In voting, a factor of 2 means accuracy drops from about 1 to about ½: **the entire Condorcet gain is lost**, and under attack the loss has no bound.

---

## 6. Why this matters for agentic and typed-model systems

1. **Shared model *and* shared input both create monoculture.** Use a 2×2 analysis: {same model, different models} × {shared input, private input}. Typed models make it cheap for every agent to read the same public context, which is where correlation enters.
2. **Typed models make the theory measurable.**
   - Explicit probabilities give calibration and competence p̂ per state.
   - Deterministic caching gives exact "common technology" semantics plus **record-and-replay** for counterfactual OPT.
   - Decision records enable certified labels (P5) and audits.
3. **A second, economic push toward monoculture.** Identical requests hit the cache, so monoculture is **cheaper**. This pressure comes on top of the accuracy incentive (B2).
4. **Design guidance for agent builders.**
   - Evaluate models **statewise**, including adversarial and "report is wrong" states, never by average accuracy (P2).
   - Cap or tax the share of decisions routed to any one model-and-input pipeline (P1, B3).
   - Keep deterministic gates on what is *executed*, not just on what the text says (Mind the Gap).
   - Treat abstention carefully: in OpenZeppelin `GovernorCountingSimple`, **Abstain counts toward quorum**.
   - Keep arithmetic and threshold checks in code. Typed models are weak at numeric rejection (Zhong et al.).
   - Pin model versions. Hosted typed models may be nondeterministic, which pushes them toward "near-common" (A9).

---

## 7. Experimental methodology (reusable)

- **Counterfactual welfare.** Log every typed-model answer as a decision record keyed by (checkpoint hash, prompt-variant id, quantised state text). Recompute welfare for **every strategy profile** offline. For symmetric binary choices, the n+1 adopter counts suffice.
- **Common random numbers** across compared profiles: same days, same RSD orders, same samples.
- **OPT** has two versions: OPT over strategy profiles (for PoA), and OPT\* with full information (the "information gap").
- **Equilibrium search.** Compare the deviator's utility using common random numbers. Report PoA, PoS, and whether a dominant strategy exists.
- **Estimating δ (KST consistency).** For pairs with x_k > x_ℓ, bucketed by value gap and rank distance, estimate P(k above ℓ)/P(ℓ above k). Then δ̂ = 1 − min over buckets, with bootstrap CIs. Add a position-conditioned estimator for the top-n positions.
- **Governance quantities:**
  - W(k) per state;
  - measured q and p_Mˢ → predicted c\* vs the empirical step;
  - estimate C (the marginal-effect constant) → predicted n₀(λ) vs the empirical uniqueness threshold.
- **Pipeline gate (run first; no LLM).** Synthetic SC rankings (Gaussian additive noise) must give PoA ≤ 2. KST's tight construction must approach 2. KST's inconsistent construction (Prop 5) must give PoA growing with n.
- **Statistics:**
  - Split dev and test by day.
  - **Pre-register** prompts, thresholds and hypotheses on dev data.
  - Report day-level bootstrap 95% CIs and seed variance.
  - Follow the 14-item checklist of Tang & Zheng.

### Scenario templates

| Scenario | Allocation (KST) | Governance (voting) | Data |
|---|---|---|---|
| **Drone ops (chosen for OASEES)** | Booking flight windows × corridors (common value = actual flyability minus energy) by forecast-based vs own-sensor rankings | Go/no-go on booked windows; the forecast **bust** is the natural adversarial state | Simulated, calibrated later to Iowa Environmental Mesonet TAF (since 1996) + METAR/ASOS, and the CMU DJI M100 delivery dataset (209 flights with onboard anemometer; Sci. Data 2021) |
| IoT air quality | Allocation of sensing or compute slots | Health or ventilation alerts from many low-cost sensors vs an official forecast | Sensor.Community archive (14k+ sensors, CSV/Parquet) |
| V2X | — | Receivers voting on whether a sender is malicious | VeReMi Extension (9 attack types) |
| ICS / 5G security | — | Sensors or monitors voting "attack / shut down" | HAI, BATADAL, 5G-NIDD |
| Edge/5G allocation | Cells or edge servers ranked by throughput | — | "Beyond Throughput" 5G traces (UCC) |

### Drone scenario: simulator sketch
- **Weather:** synoptic regime + daily cycle + corridor offset + convective events.
- **TAF-like forecast:** small error, plus busts (missed or mistimed convection) and an optional injected-text family.
- **Private nowcasts:** error grows with lead time; a per-station term η_site gives spatial correlation.
- **Common value:** v = V·1[safe]·(1 − e(W)/e_max).
- **Laya brain:** state text → one call with three questions:
  - Noul `within_limits`;
  - Score `suitability` (5 levels);
  - Choice `hazard`.
- **Ranking key:** P(within limits) × E[suitability]. **Vote:** go ⇔ P(within limits) ≥ τ.
- **Text quantisation** keeps the set of unique states bounded, so caching is exact.

### Infrastructure (planned, not built)
- Proxmox + an NVIDIA L4 (24 GB, **no MIG**). Run 8–10 laya-server processes via time-slicing or CUDA MPS.
- k3s with the GPU Operator and the DCGM exporter (GPU metrics); a CPU VM for vectorised game simulation.
- **laya-server facts (from its README):**
  - one request at a time per process;
  - ~2.2–3.3 GB RAM per process;
  - the base checkpoint truncates state at ~320 tokens (use `laya-typed-decisions`, 1024-token context);
  - on Linux it installs **CPU torch** by default (use the cu130 index for GPU);
  - determinism is **undocumented**, so measure it.
- Throughput on the L4 has not been measured. Benchmark first.

---

## 8. Open problems and paper angles

1. **The incentive-collapse theorem (B2) with full proofs.** Uniform local-CLT constant C, uniqueness above n₀, behaviour of the fragile interior equilibrium. Then the B3 tax with finite-n corrections. *Venues:* EC, SAGT, WINE, AAMAS, IJCAI/AAAI, COMSOC.
2. **Near-common technologies (A9):** extend KST's Lemma 1 beyond identical-or-independent.
3. **PL-with-bias degradation (A8):** is the m-dependence real? Tighter δ for top-n positions.
4. **Certified labels for liquid democracy (P5):** online learning with an unobservable or delayed state.
5. **Shared input vs shared model (2×2):** first systematic measurement.
6. **Correlated environments:** GSSSY's multi-valued signal applied to sensor networks with spatial correlation.
7. **The cost incentive (cache hits) as a second driver of monoculture:** model and measure it.
8. **Verifiable decision records for closed hosted models,** compared with open weights, where Laya allows replay.

---

## 9. Pitfalls checklist

- [ ] Re-verify the KST appendix proofs (Thm 3, Thm 5, smoothness) before relying on A4–A6.
- [ ] KST require **common values**. Heterogeneous agent-specific values fall outside the theory.
- [ ] Voting "PoA" uses welfare = P(correct), which is not the sum of utilities. Say so explicitly.
- [ ] Ex-ante vs statewise bounds: don't mix them (see the correction above).
- [ ] Typed-model claims (Laya ECE 0.081 vs Jev 0.246; latency) are **vendor self-reports**. Re-measure them.
- [ ] Jev is hosted and processes data outside the EEA under Standard Contractual Clauses (its DPA). Zero data retention is enterprise-only. Laya is self-hosted.
- [ ] OpenZeppelin ERC20Votes delegation is one hop. `GovernorCountingFractional` needs OZ ≥ 5.1. Abstain counts toward quorum.
- [ ] Most typed-model papers above are days-old, unreviewed preprints. Cite them as such.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **PoA / PoS** | Price of Anarchy / Price of Stability |
| **DSE** | Dominant-strategy equilibrium |
| **CCE** | Coarse correlated equilibrium |
| **RSD** | Random Serial Dictatorship: agents choose one at a time in a uniformly random order |
| **SC** | Stochastic consistency (KST) |
| **δ** | Degree of SC violation |
| **Common vs idiosyncratic technology** | Same sample for every adopter vs an independent sample per agent |
| **c\*** | Adoption share above which the DAO's accuracy collapses to the model's |
| **n₀(λ)** | Fleet size above which monoculture is the unique equilibrium |
| **Noul / Choice / Score** | Typed-decision primitives: yes-probability / one of N options / ordinal rubric |
| **System One model** | A typed decision model such as Jev or Laya |
| **TAF / METAR** | Aviation weather forecast / observation reports |
