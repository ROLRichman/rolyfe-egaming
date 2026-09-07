/* ============================================================
   RO'LYFE GAMING™ — SHARED THEME ENGINE V1.0
   File: shared/theme-engine.js

   PURPOSE
   ------------------------------------------------------------
   Central theme manager for all RO'Lyfe games.

   Supports:
   • Multiple named themes
   • Theme switching
   • CSS custom properties
   • Game-specific theme overrides
   • Theme persistence
   • System/default theme
   • Runtime theme changes
   • Theme change events
   • Export/import of theme state

   IMPORTANT
   ------------------------------------------------------------
   This file controls THEME STATE.

   Visual CSS belongs in:
       shared/theme-engine.css

   Individual games may add their own CSS, but they should
   consume the shared theme variables whenever practical.

   ============================================================ */

(function (global) {
    "use strict";


    /* --------------------------------------------------------
       CONFIGURATION
       -------------------------------------------------------- */

    const CONFIG = {
        storageKey:
            "rolyfe-gaming-theme",

        defaultTheme:
            "rolyfe",

        attribute:
            "data-rolyfe-theme",

        transitionClass:
            "rolyfe-theme-transition"
    };


    /* --------------------------------------------------------
       BUILT-IN THEMES
       --------------------------------------------------------

       These are theme definitions, not the final visual CSS.
       theme-engine.css will provide the corresponding
       variables/fallbacks.

       Games can request:
           ROLyfeThemes.set("rolyfe")
           ROLyfeThemes.set("investor")
           ROLyfeThemes.set("midnight")
           ROLyfeThemes.set("classic")
    -------------------------------------------------------- */

    const THEMES = {

        rolyfe: {
            id: "rolyfe",
            name: "RO'Lyfe",
            description:
                "Default RO'Lyfe Gaming theme"
        },


        investor: {
            id: "investor",
            name: "Investor",
            description:
                "Professional investor-style theme"
        },


        midnight: {
            id: "midnight",
            name: "Midnight",
            description:
                "Dark competitive gaming theme"
        },


        classic: {
            id: "classic",
            name: "Classic",
            description:
                "Traditional game-room theme"
        },


        neon: {
            id: "neon",
            name: "Neon",
            description:
                "High-energy arcade theme"
        }
    };


    /* --------------------------------------------------------
       STATE
       -------------------------------------------------------- */

    let currentTheme =
        CONFIG.defaultTheme;

    let initialized = false;

    let currentGame =
        null;

    const listeners = [];


    /* --------------------------------------------------------
       UTILITY
       -------------------------------------------------------- */

    function isBrowser() {

        return (
            typeof window !== "undefined" &&
            typeof document !== "undefined"
        );
    }


    function normalizeThemeId(themeId) {

        if (
            typeof themeId !== "string"
        ) {
            return null;
        }

        return themeId
            .trim()
            .toLowerCase();
    }


    function themeExists(themeId) {

        themeId =
            normalizeThemeId(themeId);

        return Boolean(
            themeId &&
            THEMES[themeId]
        );
    }


    /* --------------------------------------------------------
       STORAGE
       -------------------------------------------------------- */

    function loadStoredTheme() {

        if (!isBrowser()) {
            return null;
        }

        try {

            const stored =
                localStorage.getItem(
                    CONFIG.storageKey
                );

            if (
                stored &&
                themeExists(stored)
            ) {
                return stored;
            }

        } catch (error) {

            console.warn(
                "🎨 RO'Lyfe Theme: unable to read saved theme.",
                error
            );
        }

        return null;
    }


    function saveTheme(themeId) {

        if (!isBrowser()) {
            return;
        }

        try {

            localStorage.setItem(
                CONFIG.storageKey,
                themeId
            );

        } catch (error) {

            console.warn(
                "🎨 RO'Lyfe Theme: unable to save theme.",
                error
            );
        }
    }


    /* --------------------------------------------------------
       DOM APPLICATION
       -------------------------------------------------------- */

    function applyThemeToDocument(themeId) {

        if (!isBrowser()) {
            return;
        }

        const root =
            document.documentElement;

        /*
           Apply the primary theme attribute.
        */

        root.setAttribute(
            CONFIG.attribute,
            themeId
        );


        /*
           Also expose the theme as a normal data attribute.
           This makes future game-specific CSS selectors easier.
        */

        root.setAttribute(
            "data-theme",
            themeId
        );


        /*
           Expose current game if one has been registered.
        */

        if (currentGame) {

            root.setAttribute(
                "data-rolyfe-game",
                currentGame
            );

        } else {

            root.removeAttribute(
                "data-rolyfe-game"
            );
        }
    }


    /* --------------------------------------------------------
       TRANSITION
       -------------------------------------------------------- */

    function enableTransition() {

        if (!isBrowser()) {
            return;
        }

        document.documentElement.classList.add(
            CONFIG.transitionClass
        );


        /*
           Remove the class after the transition window.
        */

        setTimeout(
            function () {

                document.documentElement.classList.remove(
                    CONFIG.transitionClass
                );

            },
            350
        );
    }


    /* --------------------------------------------------------
       EVENTS
       -------------------------------------------------------- */

    function onThemeChange(callback) {

        if (
            typeof callback !== "function"
        ) {
            return function () {};
        }

        listeners.push(callback);


        /*
           Return unsubscribe function.
        */

        return function () {

            const index =
                listeners.indexOf(callback);

            if (index !== -1) {
                listeners.splice(
                    index,
                    1
                );
            }
        };
    }


    function emitThemeChange(previous, next) {

        const payload = {

            previous:
                previous,

            current:
                next,

            theme:
                get(next),

            game:
                currentGame
        };


        listeners.slice().forEach(
            function (callback) {

                try {

                    callback(
                        payload
                    );

                } catch (error) {

                    console.error(
                        "🎨 RO'Lyfe Theme callback error:",
                        error
                    );
                }

            }
        );


        /*
           Also provide a browser CustomEvent so other
           systems can listen without importing this object.
        */

        if (isBrowser()) {

            try {

                document.dispatchEvent(
                    new CustomEvent(
                        "rolyfe:themechange",
                        {
                            detail: payload
                        }
                    )
                );

            } catch (error) {

                /*
                   Older browsers may not support CustomEvent
                   construction. The callback system above still
                   works.
                */
            }
        }
    }


    /* --------------------------------------------------------
       SET THEME
       -------------------------------------------------------- */

    function set(themeId, options) {

        options =
            options || {};

        themeId =
            normalizeThemeId(
                themeId
            );


        if (
            !themeExists(themeId)
        ) {

            console.warn(
                "🎨 RO'Lyfe Theme: unknown theme:",
                themeId
            );

            return false;
        }


        const previous =
            currentTheme;


        if (
            previous === themeId
        ) {

            /*
               Still make sure the DOM is synchronized.
            */

            applyThemeToDocument(
                themeId
            );

            if (
                options.persist !== false
            ) {
                saveTheme(themeId);
            }

            return true;
        }


        if (
            options.transition !== false
        ) {
            enableTransition();
        }


        currentTheme =
            themeId;


        applyThemeToDocument(
            currentTheme
        );


        if (
            options.persist !== false
        ) {
            saveTheme(
                currentTheme
            );
        }


        emitThemeChange(
            previous,
            currentTheme
        );


        return true;
    }


    /* --------------------------------------------------------
       GET CURRENT THEME
       -------------------------------------------------------- */

    function getCurrent() {

        return currentTheme;
    }


    function get(themeId) {

        themeId =
            normalizeThemeId(
                themeId || currentTheme
            );


        if (
            !themeExists(themeId)
        ) {
            return null;
        }


        return Object.assign(
            {},
            THEMES[themeId]
        );
    }


    /* --------------------------------------------------------
       LIST THEMES
       -------------------------------------------------------- */

    function list() {

        return Object.keys(
            THEMES
        ).map(
            function (id) {

                return Object.assign(
                    {},
                    THEMES[id]
                );

            }
        );
    }


    /* --------------------------------------------------------
       REGISTER CUSTOM THEME
       --------------------------------------------------------

       This allows future RO'Lyfe releases or individual games
       to add a theme without rewriting this engine.
    -------------------------------------------------------- */

    function register(theme) {

        if (
            !theme ||
            typeof theme !== "object"
        ) {
            return false;
        }


        const id =
            normalizeThemeId(
                theme.id
            );


        if (!id) {

            console.warn(
                "🎨 RO'Lyfe Theme: custom theme requires an id."
            );

            return false;
        }


        THEMES[id] =
            Object.assign(
                {
                    id: id,

                    name: id,

                    description:
                        "Custom RO'Lyfe theme"
                },

                theme,

                {
                    id: id
                }
            );


        return true;
    }


    /* --------------------------------------------------------
       REMOVE CUSTOM THEME
       --------------------------------------------------------

       Built-in themes are protected.
    -------------------------------------------------------- */

    function remove(themeId) {

        themeId =
            normalizeThemeId(
                themeId
            );


        if (
            !themeExists(themeId)
        ) {
            return false;
        }


        if (
            themeId === CONFIG.defaultTheme
        ) {

            console.warn(
                "🎨 RO'Lyfe Theme: default theme cannot be removed."
            );

            return false;
        }


        /*
           Built-in themes remain protected.
        */

        const builtIn =
            [
                "rolyfe",
                "investor",
                "midnight",
                "classic",
                "neon"
            ];


        if (
            builtIn.includes(themeId)
        ) {

            console.warn(
                "🎨 RO'Lyfe Theme: built-in theme cannot be removed."
            );

            return false;
        }


        delete THEMES[themeId];


        if (
            currentTheme === themeId
        ) {

            set(
                CONFIG.defaultTheme
            );
        }


        return true;
    }


    /* --------------------------------------------------------
       GAME REGISTRATION
       --------------------------------------------------------

       Lets a game identify itself to the theme engine.

       Example:
           ROLyfeThemes.setGame("pool");
    -------------------------------------------------------- */

    function setGame(gameId) {

        if (
            gameId === null ||
            gameId === undefined ||
            gameId === ""
        ) {

            currentGame = null;

            applyThemeToDocument(
                currentTheme
            );

            return null;
        }


        currentGame =
            String(gameId)
                .trim()
                .toLowerCase();


        applyThemeToDocument(
            currentTheme
        );


        return currentGame;
    }


    function getGame() {

        return currentGame;
    }


    /* --------------------------------------------------------
       INITIALIZATION
       -------------------------------------------------------- */

    function init(options) {

        options =
            options || {};


        if (
            initialized
        ) {
            return getState();
        }


        let initialTheme =
            normalizeThemeId(
                options.theme
            );


        /*
           Explicit theme has highest priority.
        */

        if (
            !themeExists(initialTheme)
        ) {

            initialTheme =
                loadStoredTheme();
        }


        if (
            !themeExists(initialTheme)
        ) {

            initialTheme =
                CONFIG.defaultTheme;
        }


        currentTheme =
            initialTheme;


        if (
            options.game
        ) {

            setGame(
                options.game
            );
        }


        applyThemeToDocument(
            currentTheme
        );


        if (
            options.persist !== false
        ) {
            saveTheme(
                currentTheme
            );
        }


        initialized = true;


        return getState();
    }


    /* --------------------------------------------------------
       RESET
       -------------------------------------------------------- */

    function reset(options) {

        options =
            options || {};


        set(
            CONFIG.defaultTheme,
            {
                persist:
                    options.persist !== false,

                transition:
                    options.transition !== false
            }
        );


        return getState();
    }


    /* --------------------------------------------------------
       STATE
       -------------------------------------------------------- */

    function getState() {

        return {

            initialized:
                initialized,

            currentTheme:
                currentTheme,

            theme:
                get(
                    currentTheme
                ),

            game:
                currentGame,

            availableThemes:
                Object.keys(
                    THEMES
                )
        };
    }


    /* --------------------------------------------------------
       EXPORT / IMPORT
       -------------------------------------------------------- */

    function exportState() {

        return JSON.stringify(
            {
                version: "1.0",

                theme:
                    currentTheme,

                game:
                    currentGame
            }
        );
    }


    function importState(data, options) {

        options =
            options || {};


        let parsed = data;


        if (
            typeof data === "string"
        ) {

            try {

                parsed =
                    JSON.parse(data);

            } catch (error) {

                console.warn(
                    "🎨 RO'Lyfe Theme: invalid theme state."
                );

                return false;
            }
        }


        if (
            !parsed ||
            typeof parsed !== "object"
        ) {
            return false;
        }


        if (
            parsed.game !== undefined
        ) {

            setGame(
                parsed.game
            );
        }


        if (
            parsed.theme &&
            themeExists(
                parsed.theme
            )
        ) {

            return set(
                parsed.theme,
                options
            );
        }


        return false;
    }


    /* --------------------------------------------------------
       PUBLIC API
       -------------------------------------------------------- */

    const ROLyfeThemes = {

        init:
            init,

        set:
            set,

        get:
            get,

        getCurrent:
            getCurrent,

        list:
            list,

        register:
            register,

        remove:
            remove,

        reset:
            reset,

        setGame:
            setGame,

        getGame:
            getGame,

        onChange:
            onThemeChange,

        getState:
            getState,

        exportState:
            exportState,

        importState:
            importState,

        config:
            Object.assign(
                {},
                CONFIG
            ),

        version:
            "1.0"
    };


    /* --------------------------------------------------------
       GLOBAL EXPORT
       -------------------------------------------------------- */

    global.ROLyfeThemes =
        ROLyfeThemes;


    /*
       Compatibility alias.
    */

    global.ROlyfeThemes =
        ROLyfeThemes;


    /* --------------------------------------------------------
       AUTO INITIALIZATION
       -------------------------------------------------------- */

    if (
        isBrowser()
    ) {

        if (
            document.readyState ===
            "loading"
        ) {

            document.addEventListener(
                "DOMContentLoaded",
                function () {
                    init();
                },
                {
                    once: true
                }
            );

        } else {

            init();
        }
    }


    /* --------------------------------------------------------
       READY MESSAGE
       -------------------------------------------------------- */

    console.log(
        "🎨 RO'Lyfe Theme Engine v1.0 loaded."
    );


})(window);
