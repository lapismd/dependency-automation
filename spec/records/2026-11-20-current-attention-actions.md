# Current coordinator attention and actions

The live coordinator report could retain an unresolved prior operation in a
node's final holds while omitting that blocker from its structured attention.
Wave planning projected attention before unresolved-operation detection changed
the node from admitted to uncertain, so a maintenance screen could lead with
older generic waits even though no open pull request existed and the exact
operation was the immediate blocker.

DA-WAVE-002 now requires attention to be projected only after final node status,
holds and operation state are known. The focused wave regression constructs the
same later-candidate sequence and proves that the first attention entry identifies
the exact prior operation as requiring reconciliation.

The projection also distinguishes packages whose bytes already exist but await
reviewed-channel admission, and packages whose publisher contract remains
unreviewed, from packages that still need qualification or publication. Those
states provide channel-policy and publisher-policy review actions respectively;
they no longer imply that an operator should publish identical bytes again.

Under the reviewed Node 24.15.0 contract, the focused attention projection
passes 3/3 and the exact unresolved-operation sequence passes 1/1. Repository
formatting and policy checks pass, as do all three canonical specification
lanes. Actionlint and all 19 generated Renovate configurations pass. A fresh
read-only inventory reports 19 repositories, 42 public package owners, 212
consumer edges, zero cycles and zero coverage holds.

Specification doctor passes 11/11 and semantic QMD search discovers
DA-WAVE-002. The host QMD native installation currently matches Node 26, so
those local search-only checks use that host ABI; product and specification
validation retain Node 24. Full local verification reaches unchanged native
Linux projection and standard publication-verifier fixtures that are unavailable
on this macOS host; no platform or verification gate is weakened.
