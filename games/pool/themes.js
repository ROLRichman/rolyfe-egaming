/*
===========================================================
RO'LYFE GAMING™ — POOL THEMES ENGINE V3.2
===========================================================
Purpose:
- Pool-specific visual themes
- Shared theme-engine compatibility
- Local theme persistence
- Safe fallback to RO'Lyfe theme
- No external dependencies
===========================================================
*/

(function () {
    "use strict";

    const DEFAULT_POOL_THEME = "rolyfe";

    const THEMES = {

        classic: {
            name: "Classic",
            description: "Traditional pool hall",
            colors: {
                primary: "#1f6f43",
                secondary: "#d4af37",
                accent: "#ffffff",
                background: "#07100c",
                surface: "#0d1b14",
                table: "#0b5d36",
                rail: "#5b351b",
                text: "#ffffff",
                muted: "#9fb3a7",
                danger: "#d64545",
                success: "#43d17c"
            }
        },

        rolyfe: {
            name: "RO'Lyfe",
           
