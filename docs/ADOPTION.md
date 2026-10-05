# Adoption

Start with the included fixture, replace it with one internal example, and add a regression test for every production workflow you rely on.

The `adopter-missing-input.json` and `adopter-side-effect.json` fixtures show two common launch-content handoffs: requesting multiple source documents and requesting an external email. Their regression tests verify that missing inputs are requested and durable actions are gated. Use synthetic examples unless you have permission to include adopter data.
