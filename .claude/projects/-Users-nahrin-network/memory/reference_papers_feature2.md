---
name: Feature 2 scientific foundations
description: Key findings from Granovetter (1973) and Rajkumar et al. (2022) that must drive Feature 2 design decisions for gap analysis and network positions
type: reference
---

## Granovetter (1973) — "The Strength of Weak Ties"

**Tie strength definition** (p.1361): A (probably linear) combination of:
1. Amount of time
2. Emotional intensity
3. Intimacy (mutual confiding)
4. Reciprocal services

**Core hypothesis** (p.1362): The stronger the tie between A and B, the larger the proportion of individuals in set S (all persons with ties to either or both) who will be tied to both — i.e., friendship circle overlap increases with tie strength.

**Forbidden triad** (p.1363, Fig.1): If A-B is strong and A-C is strong, then B-C tie is almost always present (weak or strong). A triad with two strong ties and one absent tie is "forbidden."

**Bridge definition** (p.1364): A line in a network providing the *only* path between two points. Key insight: **all bridges are weak ties** (since a strong tie A-B implies A's other strong contacts also know B, so alternative paths exist). Weak ties suffer no such restriction.

**Local bridge** (p.1365, Fig.2): A tie A-B is a local bridge of degree n if the shortest path between A and B (other than A-B itself) is n, and n > 2. More significant when it provides the only *efficient* path between two sectors.

**Network density** (p.1370): Bott's crucial variable — whether ego's friends know one another ("close-knit") or not ("loose-knit"). Dense strong-tie sector vs. less-dense weak-tie sector.

**Egocentric network structure** (p.1370): Ego's network divides into:
- Strong ties + non-bridging weak ties → dense part (effective network)
- Bridging weak ties → extended/sparse part (reach into other clusters)

**Job mobility findings** (p.1371-1372):
- 55.6% found jobs through contacts seen "often" (strong), 27.8% "occasionally," 16.7% "rarely" (weak) — but the SKEW toward weak end is what matters
- Contacts who provided job info were often *marginal* — old college friends, former workmates with sporadic contact
- 39.1% of job info came directly from prospective employer known to respondent; 45.3% through one intermediary; only 12.5%+3.1% through 2+ intermediaries
- Short paths dominate, but those with >1 intermediary tended to be young, under threat of unemployment — influence was exerted on their behalf

## Rajkumar et al. (2022) — "A Causal Test of the Strength of Weak Ties"

**Scale**: 20M+ LinkedIn users, 2B new ties, 600K new jobs over 5 years (2015-2019).

**Tie strength measured two ways**:
1. **Structural tie strength** = Mij / (Di + Dj - Mij - 2), where M = mutual connections, D = degree. This is essentially the overlap coefficient.
2. **Interaction intensity** = count of bilateral messages between two people.

**Network diversity** = 1 - Ci, where Ci is the local clustering coefficient.

**Three key findings**:

1. **Inverted U-shape** (Fig.3B): For structural tie strength (mutual friends), moderately weak ties (around 10 mutual friends) maximize job transmission probability. Beyond that, probability drops. Not monotonically weak-is-best.

2. **Weakest interaction intensity is best** (Fig.3C): For interaction intensity, the weakest ties (least messaging) had the greatest impact on job mobility. Direct reversal of correlational evidence.

3. **Industry heterogeneity** (Fig.4): Weak ties increase job mobility more in digital/tech industries. Strong ties increase job mobility more in less-digital industries.

**Critical nuance**: OLS (correlational) analysis showed strong ties correlated with more job transmission — the "paradox of weak ties." Only the IV (causal/experimental) analysis reversed this and confirmed weak ties' causal superiority. This means naive correlation between tie strength and outcomes is misleading.

## Yousif (2026) — "The Invisible Network"

**Three-Layer Graph Model** (Section 6.2):
- Layer 1: Visible connections (1st-degree) — 50-500 people
- Layer 2: Shared-context connections (2nd-degree, alumni, groups) — 5K-50K
- Layer 3: Latent signal connections (3rd-degree, content engagement) — hundreds of thousands

**Bonding vs. Bridging Capital** (Putnam framework, Section 7.2):
- Disconnected job seekers have bonding capital surplus + bridging capital deficit
- New graduates: "horizontal wealth, vertical poverty" — rich in peer connections, poor in hierarchical ones
- Immigrants: network exists but is geographically mislocated
- Career changers: network perceived as irrelevant but actually field-adjacent

**Network Archaeology** (Section 6.3): Excavation → Assay → Activation
- Rank Layer 2 connections by: (a) shared context, (b) proximity to hiring, (c) estimated responsiveness
- Graph propagation: each informational interview ending with "who else?" extends network 1-3 nodes

**Platform recommendation** (Section 8.4, #27): "Develop network gap identification features that alert users when their professional graph has low bridging capital relative to their industry and career stage" — this IS Feature 2's gap analysis.

**Digital connectivity paradox**: Structurally disconnected job seekers systematically underestimate their network size. Even 50 connections → thousands at Layer 2. The problem is not absence of network but absence of a map.

**Double exclusion**: Well-connected navigate the referral economy (bypasses AI). Disconnected are concentrated in the application economy (highest AI bias). The network gap and algorithmic bias gap are intersecting expressions of the same inequality.

## Implications for Feature 2 Design

- **Tie strength**: Should use Rajkumar's structural formula: Mij / (Di + Dj - Mij - 2), based on mutual connections and degree. This is the paper's primary measure.
- **Network diversity**: Use 1 - clustering coefficient (per Rajkumar).
- **Bridge detection**: Must follow Granovetter — bridges are weak ties that connect otherwise disconnected network sectors. Use local bridge degree, not role category.
- **Network positions**: Should reflect Granovetter's ego-network structure — dense cluster members vs. bridging ties vs. peripheral/isolate.
- **Gap analysis**: Should measure **bridging capital deficit** (per Yousif/Putnam), not just role-category distribution. Alert when network has low bridging capital relative to career stage.
- **Gap analysis detail**: Should consider Rajkumar's inverted-U finding — the "ideal" isn't just maximizing weak ties, it's having moderately weak ties. Pure isolates (zero mutual friends) are less valuable than moderate-overlap connections.
- **Do NOT invent metrics**: Only use tie strength, structural overlap, clustering coefficient, local bridge degree, network diversity, bonding/bridging capital as defined in these papers.
