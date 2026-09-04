/* =========================================================
   RO'LYFE POOL™ — V3.2 THEME ENGINE
   ---------------------------------------------------------
   Pool-specific theme definitions
   11 supported themes
   • Classic
   • RO'Lyfe
   • EM Gaming
   • ACE
   • Business
   • Real Estate
   • Investor
   • 7FIGURES
   • Midnight
   • Neon
   • Championship

   Exposes:
   window.ROLYFE_POOL_THEMES
   window.ROLYFE_POOL_THEME
========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "rolyfe_pool_theme";

    /* =====================================================
       THEME DEFINITIONS
    ===================================================== */

    const themes = {

        classic: {
            name: "Classic",

            vars: {
                "--pool-bg": "#07100c",
                "--pool-panel": "#101b15",
                "--pool-panel-2": "#16251c",
                "--pool-border": "#294332",

                "--pool-primary": "#1f8f4d",
                "--pool-primary-2": "#2ebd67",
                "--pool-accent": "#d4af37",

                "--pool-text": "#f5f5f5",
                "--pool-muted": "#91a49a",

                "--pool-table": "#126b3b",
                "--pool-table-dark": "#0a4828",
                "--pool-rail": "#4b2c19",

                "--pool-danger": "#d94b4b",
                "--pool-warning": "#e5a93d",
                "--pool-success": "#2ebd67"
            }
        },

        rolyfe: {
            name: "RO'Lyfe",

            vars: {
                "--pool-bg": "#050b08",
                "--pool-panel": "#0b1710",
                "--pool-panel-2": "#102219",
                "--pool-border": "#1d5134",

                "--pool-primary": "#16a34a",
                "--pool-primary-2": "#39d56f",
                "--pool-accent": "#d7b84a",

                "--pool-text": "#f7fff9",
                "--pool-muted": "#91ae9d",

                "--pool-table": "#075d31",
                "--pool-table-dark": "#043d20",
                "--pool-rail": "#352116",

                "--pool-danger": "#ef4444",
                "--pool-warning": "#f5b942",
                "--pool-success": "#32d76b"
            }
        },

        emg: {
            name: "EM Gaming",

            vars: {
                "--pool-bg": "#080812",
                "--pool-panel": "#111122",
                "--pool-panel-2": "#181833",
                "--pool-border": "#30305c",

                "--pool-primary": "#6845ff",
                "--pool-primary-2": "#936dff",
                "--pool-accent": "#00d9ff",

                "--pool-text": "#f7f7ff",
                "--pool-muted": "#a5a5c4",

                "--pool-table": "#173f35",
                "--pool-table-dark": "#0d2924",
                "--pool-rail": "#27202e",

                "--pool-danger": "#ff4d67",
                "--pool-warning": "#ffc857",
                "--pool-success": "#43e68b"
            }
        },

        ace: {
            name: "ACE",

            vars: {
                "--pool-bg": "#080a0e",
                "--pool-panel": "#11151c",
                "--pool-panel-2": "#181e28",
                "--pool-border": "#303947",

                "--pool-primary": "#d7a928",
                "--pool-primary-2": "#f3ca4d",
                "--pool-accent": "#ffffff",

                "--pool-text": "#ffffff",
                "--pool-muted": "#9da8b8",

                "--pool-table": "#123f32",
                "--pool-table-dark": "#09291f",
                "--pool-rail": "#292b31",

                "--pool-danger": "#e54a4a",
                "--pool-warning": "#f3c64b",
                "--pool-success": "#38c978"
            }
        },

        business: {
            name: "Business",

            vars: {
                "--pool-bg": "#0a0d12",
                "--pool-panel": "#121821",
                "--pool-panel-2": "#1a222d",
                "--pool-border": "#33404f",

                "--pool-primary": "#2563eb",
                "--pool-primary-2": "#4f8cff",
                "--pool-accent": "#c9a227",

                "--pool-text": "#f4f7fb",
                "--pool-muted": "#9aa8b8",

                "--pool-table": "#174b39",
                "--pool-table-dark": "#0d3025",
                "--pool-rail": "#242933",

                "--pool-danger": "#dc4545",
                "--pool-warning": "#e6b34a",
                "--pool-success": "#36c879"
            }
        },

        realestate: {
            name: "Real Estate",

            vars: {
                "--pool-bg": "#090b0a",
                "--pool-panel": "#121713",
                "--pool-panel-2": "#1b221c",
                "--pool-border": "#384438",

                "--pool-primary": "#276749",
                "--pool-primary-2": "#3e9b6a",
                "--pool-accent": "#c5a55a",

                "--pool-text": "#f4f5f0",
                "--pool-muted": "#9da79d",

                "--pool-table": "#145638",
                "--pool-table-dark": "#0c3825",
                "--pool-rail": "#49321f",

                "--pool-danger": "#d94b4b",
                "--pool-warning": "#d9aa48",
                "--pool-success": "#45c77b"
            }
        },

        investor: {
            name: "Investor",

            vars: {
                "--pool-bg": "#070c0b",
                "--pool-panel": "#0d1714",
                "--pool-panel-2": "#13221c",
                "--pool-border": "#285040",

                "--pool-primary": "#0f9f58",
                "--pool-primary-2": "#32d879",
                "--pool-accent": "#e0b83f",

                "--pool-text": "#f7fff9",
                "--pool-muted": "#94ada1",

                "--pool-table": "#075f35",
                "--pool-table-dark": "#043a21",
                "--pool-rail": "#382417",

                "--pool-danger": "#df4545",
                "--pool-warning": "#e8b642",
                "--pool-success": "#31d474"
            }
        },

        sevenfigures: {
            name: "7FIGURES",

            vars: {
                "--pool-bg": "#080706",
                "--pool-panel": "#15110a",
                "--pool-panel-2": "#201a0c",
                "--pool-border": "#59491e",

                "--pool-primary": "#b88a12",
                "--pool-primary-2": "#f0c94b",
                "--pool-accent": "#fff0a6",

                "--pool-text": "#fffdf2",
                "--pool-muted": "#b6aa83",

                "--pool-table": "#174b32",
                "--pool-table-dark": "#0c3020",
                "--pool-rail": "#4a3017",

                "--pool-danger": "#d94444",
                "--pool-warning": "#f1c54b",
                "--pool-success": "#4bd17d"
            }
        },

        midnight: {
            name: "Midnight",

            vars: {
                "--pool-bg": "#04060c",
                "--pool-panel": "#0a0f1d",
                "--pool-panel-2": "#11182a",
                "--pool-border": "#273550",

                "--pool-primary": "#3559d6",
                "--pool-primary-2": "#5e82ff",
                "--pool-accent": "#70d7ff",

                "--pool-text": "#f5f8ff",
                "--pool-muted": "#929db4",

                "--pool-table": "#0b4b38",
                "--pool-table-dark": "#062e23",
                "--pool-rail": "#1e2431",

                "--pool-danger": "#e3485c",
                "--pool-warning": "#e8b74d",
                "--pool-success": "#3ed38a"
            }
        },

        neon: {
            name: "Neon",

            vars: {
                "--pool-bg": "#030507",
                "--pool-panel": "#081014",
                "--pool-panel-2": "#0d1b20",
                "--pool-border": "#174d53",

                "--pool-primary": "#00d9a0",
                "--pool-primary-2": "#00ffbf",
                "--pool-accent": "#00eaff",

                "--pool-text": "#ecffff",
                "--pool-muted": "#7fa9ad",

                "--pool-table": "#07583d",
                "--pool-table-dark": "#033425",
                "--pool-rail": "#132b2e",

                "--pool-danger": "#ff426d",
                "--pool-warning": "#ffe05b",
                "--pool-success": "#00f5a0"
            }
        },

        championship: {
            name: "Championship",

            vars: {
                "--pool-bg": "#08090b",
                "--pool-panel": "#121418",
                "--pool-panel-2": "#1b1e24",
                "--pool-border": "#3d424b",

                "--pool-primary": "#b18a32",
                "--pool-primary-2": "#e1bd58",
                "--pool-accent": "#f5f0dc",

                "--pool-text": "#ffffff",
                "--pool-muted": "#a2a5aa",

                "--pool-table": "#0d5033",
                "--pool-table-dark": "#07311f",
                "--pool-rail": "#302820",

                "--pool-danger": "#d94444",
                "--pool-warning": "#e2b64c",
                "--pool-success": "#40c879"
            }
        }
    };

    /* =====================================================
       APPLY THEME
    ===================================================== */

    function applyTheme(themeName) {
        if (!themes[themeName]) {
            themeName = "rolyfe";
        }

        const theme = themes[themeName];

        const root =
            document.documentElement;

        Object.entries(theme.vars).forEach(
            ([property, value]) => {
                root.style.setProperty(
                    property,
                    value
                );
            }
        );

        root.dataset.poolTheme =
            themeName;

        document.body.dataset.poolTheme =
            themeName;

        document.body.classList.remove(
            ...Object.keys(themes).map(
                name => `pool-theme-${name}`
            )
        );

        document.body.classList.add(
            `pool-theme-${themeName}`
        );

        try {
            localStorage.setItem(
                STORAGE_KEY,
                themeName
            );
        } catch (error) {
            /* Storage may be unavailable. */
        }

        updateThemeSelector(themeName);

        return theme;
    }

    /* =====================================================
       THEME SELECTOR
    ===================================================== */

    function updateThemeSelector(themeName) {
        const selector =
            document.getElementById(
                "poolTheme"
            );

        if (!selector) return;

        if (
            [...selector.options].some(
                option =>
                    option.value === themeName
            )
        ) {
            selector.value =
                themeName;
        }
    }

    /* =====================================================
       LOAD SAVED THEME
    ===================================================== */

    function getSavedTheme() {
        try {
            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (
                saved &&
                themes[saved]
            ) {
                return saved;
            }
        } catch (error) {
            /* Ignore storage errors. */
        }

        return "rolyfe";
    }

    /* =====================================================
       PUBLIC THEME API
    ===================================================== */

    const themeAPI = {
        version: "3.2",

        themes,

        apply: applyTheme,

        applyTheme,

        getSavedTheme,

        getCurrentTheme: () =>
            document.documentElement
                .dataset.poolTheme ||
            getSavedTheme(),

        getTheme: themeName =>
            themes[themeName] || null,

        list: () =>
            Object.keys(themes),

        names: () =>
            Object.values(themes).map(
                theme => theme.name
            )
    };

    window.ROLYFE_POOL_THEMES =
        themeAPI;

    window.ROLYFE_POOL_THEME =
        themeAPI;

    /* =====================================================
       INITIALIZE
    ===================================================== */

    const initialTheme =
        getSavedTheme();

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                applyTheme(
                    initialTheme
                );
            },
            { once: true }
        );
    } else {
        applyTheme(
            initialTheme
        );
    }

})();
