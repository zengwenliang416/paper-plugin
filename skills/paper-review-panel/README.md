# Paper Review Panel

Configures multi-model, multi-perspective review for a paper/thesis project: the enable switch and the `(model × lens)` panel matrix stored in `.paper-context/review-panel.yaml`.

This skill owns only the configuration. The actual review run is performed by a later step that consumes this file. Secrets are never stored — each endpoint references an environment-variable name (`auth_env`).
