/* =========================================================
   RO'LYFE DOCS CENTER™
   themes.js
   V1.0 — Docs Theme Controller
   ========================================================= */

"use strict";


const ROLyfeDocsThemes = {

    version: "1.0",

    storageKey:
        "rolyfe_docs_theme",


    /* =====================================================
       AVAILABLE THEMES
       ===================================================== */

    themes: {

        midnight: {

            name: "Midnight",

            description:
                "Classic RO'Lyfe dark command interface.",

            variables: {

                "--bg-main": "#070b16",
                "--bg-secondary": "#0b1020",
                "--bg-card": "#10182b",
                "--bg-card-hover": "#16213a",

                "--border":
                    "rgba(110, 140, 220, 0.22)",

                "--border-strong":
                    "rgba(120, 160, 255, 0.42)",

                "--text-main": "#f3f6ff",
                "--text-secondary": "#aeb9d4",
                "--text-muted": "#73809d",

                "--blue": "#4f8cff",
                "--blue-bright": "#70a7ff",
                "--purple": "#8b5cf6",
                "--purple-bright": "#a78bfa",
                "--teal": "#20d9c4",
                "--green": "#4ade80",
                "--yellow": "#facc15",
                "--red": "#fb7185"

            }

        },


        /* =================================================
           PURPLE COMMAND
           ================================================= */

        purple: {

            name: "Purple Command",

            description:
                "A stronger purple-forward RO'Lyfe interface.",

            variables: {

                "--bg-main": "#090711",
                "--bg-secondary": "#100b1d",
                "--bg-card": "#171027",
                "--bg-card-hover": "#21163a",

                "--border":
                    "rgba(164, 120, 255, 0.24)",

                "--border-strong":
                    "rgba(183, 145, 255, 0.48)",

                "--text-main": "#f8f5ff",
                "--text-secondary": "#c0b4d9",
                "--text-muted": "#817596",

                "--blue": "#7c83ff",
                "--blue-bright": "#9aa0ff",
                "--purple": "#9b5cff",
                "--purple-bright": "#bb8cff",
                "--teal": "#35dfc9",
                "--green": "#5ee88a",
                "--yellow": "#f6d75d",
                "--red": "#fb7185"

            }

        },


        /* =================================================
           TEAL OPERATIONS
           ================================================= */

        teal: {

            name: "Teal Operations",

            description:
                "A cleaner utility and operations interface.",

            variables: {

                "--bg-main": "#061011",
                "--bg-secondary": "#081719",
                "--bg-card": "#0d2022",
                "--bg-card-hover": "#123033",

                "--border":
                    "rgba(74, 220, 204, 0.20)",

                "--border-strong":
                    "rgba(74, 220, 204, 0.44)",

                "--text-main": "#effffd",
                "--text-secondary": "#afd0cc",
                "--text-muted": "#6e9692",

                "--blue": "#5da9ff",
                "--blue-bright": "#80baff",
                "--purple": "#a477ff",
                "--purple-bright": "#bd9bff",
                "--teal": "#2de0ca",
                "--green": "#5ee88a",
                "--yellow": "#f4d35e",
                "--red": "#fb7185"

            }

        }

    },


    /* =====================================================
       INITIALIZE
       ===================================================== */

    init() {

        const savedTheme =
            this.getSavedTheme();

        this.apply(
            savedTheme
        );

        this.createThemeControls();

        console.log(
            "RO'Lyfe Docs Themes™ initialized — V1.0"
        );

    },


    /* =====================================================
       APPLY THEME
       ===================================================== */

    apply(themeName) {

        if (
            !this.themes[themeName]
        ) {

            themeName =
                "midnight";

        }


        const theme =
            this.themes[themeName];


        const root =
            document.documentElement;


        Object.entries(
            theme.variables
        ).forEach(
            ([property, value]) => {

                root.style.setProperty(
                    property,
                    value
                );

            }
        );


        document.body.dataset.theme =
            themeName;


        this.currentTheme =
            themeName;


        this.saveTheme(
            themeName
        );


        this.updateThemeControl(
            themeName
        );

    },


    /* =====================================================
       SAVE
       ===================================================== */

    saveTheme(themeName) {

        try {

            localStorage.setItem(
                this.storageKey,
                themeName
            );

        } catch (error) {

            console.warn(
                "RO'Lyfe Docs: Theme could not be saved.",
                error
            );

        }

    },


    /* =====================================================
       LOAD
       ===================================================== */

    getSavedTheme() {

        try {

            const saved =
                localStorage.getItem(
                    this.storageKey
                );


            if (
                saved &&
                this.themes[saved]
            ) {

                return saved;

            }

        } catch (error) {

            console.warn(
                "RO'Lyfe Docs: Could not read saved theme.",
                error
            );

        }


        return "midnight";

    },


    /* =====================================================
       NEXT THEME
       ===================================================== */

    next() {

        const names =
            Object.keys(
                this.themes
            );


        const currentIndex =
            names.indexOf(
                this.currentTheme
            );


        const nextIndex =
            (currentIndex + 1) %
            names.length;


        this.apply(
            names[nextIndex]
        );

    },


    /* =====================================================
       CREATE THEME CONTROL
       ===================================================== */

    createThemeControls() {

        if (
            document.getElementById(
                "docsThemeControls"
            )
        ) {

            return;

        }


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.id =
            "docsThemeControls";


        wrapper.className =
            "docs-theme-controls";


        wrapper.innerHTML = `

            <div class="docs-theme-label">
                🎨 Theme
            </div>

            <select
                id="docsThemeSelect"
                class="select"
                aria-label="Choose Docs Center theme"
            >
                ${Object.entries(
                    this.themes
                ).map(
                    ([key, theme]) => `
                        <option value="${key}">
                            ${theme.name}
                        </option>
                    `
                ).join("")}
            </select>

            <button
                id="docsThemeNext"
                class="btn"
                type="button"
            >
                Next Theme
            </button>

        `;


        /*
         * Place the control near the top of
         * the document without changing the
         * existing page HTML.
         */

        const nav =
            document.querySelector(
                ".top-nav-inner"
            );


        if (nav) {

            nav.appendChild(
                wrapper
            );

        } else {

            document.body.prepend(
                wrapper
            );

        }


        const select =
            document.getElementById(
                "docsThemeSelect"
            );


        const nextButton =
            document.getElementById(
                "docsThemeNext"
            );


        if (select) {

            select.value =
                this.currentTheme;


            select.addEventListener(
                "change",
                event => {

                    this.apply(
                        event.target.value
                    );

                }
            );

        }


        if (nextButton) {

            nextButton.addEventListener(
                "click",
                () => {

                    this.next();

                }
            );

        }

    },


    /* =====================================================
       UPDATE CONTROL
       ===================================================== */

    updateThemeControl(
        themeName
    ) {

        const select =
            document.getElementById(
                "docsThemeSelect"
            );


        if (select) {

            select.value =
                themeName;

        }

    },


    /* =====================================================
       GET CURRENT THEME
       ===================================================== */

    getCurrentTheme() {

        return (
            this.currentTheme ||
            "midnight"
        );

    },


    /* =====================================================
       RESET
       ===================================================== */

    reset() {

        this.apply(
            "midnight"
        );

    }

};


/* =========================================================
   PUBLIC API
   ========================================================= */

window.ROLyfeDocsThemes =
    ROLyfeDocsThemes;


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        ROLyfeDocsThemes.init();

    }
);
