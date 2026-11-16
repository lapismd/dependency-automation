# Public cryptographic test inputs

File Explorer 0.2.8 is an immutable public npm package owned by LapisMD. These
bounded fixture bytes contain its public package metadata, signed attestations
and 15 KB tarball. Certificates and registry keys are public verification data;
there are no signing credentials. Tests never execute or install this tarball.

The fixture exercises real signature, certificate, transparency, digest and
mutation checks without networking. It is never a production fallback or a
live publication/qualification snapshot. Live observations remain ignored under
reports/; the canonical book includes no operational artifacts or these inputs.

`notebook-core-intake.json.gz` contains immutable public input data for Notebook
PR36 (Core 0.13.3 to 0.13.4): the exact two manifests/workspace and lock snapshots.
It is compressed test data, never installed, executed, or used as production
fallback. Its source/candidate revisions are recorded inside the fixture.
