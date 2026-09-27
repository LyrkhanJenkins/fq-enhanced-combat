import {beforeEach, vi} from "vitest";

// ════════════════════════════════════════════════════════════════════════════
// ZONE 1 — Foundry chargé une seule fois (globals stables, non réinitialisés
// entre les tests).
// ════════════════════════════════════════════════════════════════════════════

globalThis.Hooks = {
    on: vi.fn(), once: vi.fn(), call: vi.fn(), callAll: vi.fn(),
};

globalThis.foundry = {
    utils: {
        debounce: (fn, delay) => {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => fn(...args), delay);
            };
        },
        mergeObject: (a, b) => ({...a, ...b}),
        deepClone: (o) => JSON.parse(JSON.stringify(o)),
        randomID: () => Math.random().toString(36).slice(2),
    }
};

// ════════════════════════════════════════════════════════════════════════════
// ZONE 2 — Globals réinitialisés avant chaque test (mocks à compteur d'appels).
// ════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
    // Remis à neuf à chaque test : `src/init-enhanced-combat.js` écrit ici, et
    // le hook `setup` y recopie les réglages.
    globalThis.CONFIG = {
        FqEnhancedCombat: {
            options: {
                debug: false
            }
        }
    };

    globalThis.ui = {
        notifications: {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
        },
    };

    globalThis.game = {
        i18n: {
            localize: vi.fn(str => str),
            format: vi.fn((str, args) => str + JSON.stringify(args))
        },
        // `get` rend undefined par défaut : chaque suite surcharge par
        // mockReturnValue le réglage dont elle a besoin.
        settings: {
            get: vi.fn(() => undefined),
            register: vi.fn(),
        },
        modules: new Map(),
        user: {isGM: false},
    };
});
