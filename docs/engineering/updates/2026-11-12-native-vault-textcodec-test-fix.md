# MOVO native vault text codec test environment

## 2026-11-12 — Native vault Jest environment compatibility

Initial vault test suite failed to initialize in jsdom because browser TextEncoder was instantiated at module import time. Resolve WebCrypto text codecs lazily on encryption/decryption and inject Node's standard TextEncoder/TextDecoder into the isolated jsdom test environment. No runtime data path or cryptography semantics changed; complete tests must pass on exact head before release.
