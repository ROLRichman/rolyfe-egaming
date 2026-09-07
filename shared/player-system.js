/* ============================================================
   RO'LYFE GAMING™ — SHARED PLAYER SYSTEM V1.0
   File: shared/player-system.js

   PURPOSE
   ------------------------------------------------------------
   Shared player-management system for all RO'Lyfe games.

   Supports:
   • Human players
   • AI players
   • Multiple players
   • Player IDs
   • Player names
   • Player types
   • Player levels
   • Scores
   • Wins / losses / draws
   • Turn management
   • Active-player tracking
   • Player metadata
   • Player state
   • Adding / removing players
   • Resetting scores
   • Serialization / snapshots

   IMPORTANT
   ------------------------------------------------------------
   This system manages PLAYERS.

   It does NOT contain:
   • Pool rules
   • Chess rules
   • Checkers rules
   • Monopoly rules
   • AI decision-making
   • Game-specific scoring rules

   Individual games remain responsible for their own rules.

   ============================================================ */

(function (global) {
    "use strict";


    /* --------------------------------------------------------
       CONFIGURATION
       -------------------------------------------------------- */

    const CONFIG = {
        defaultName: "Player",
        defaultType: "human",
        defaultLevel: 1,

        maxPlayers: 16,

        validTypes: [
            "human",
            "ai"
        ]
    };


    /* --------------------------------------------------------
       INTERNAL ID
       -------------------------------------------------------- */

    let nextPlayerId = 1;


    /* --------------------------------------------------------
       UTILITY
       -------------------------------------------------------- */

    function toNumber(value, fallback) {

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }


    function cleanName(name, fallback) {

        if (
            typeof name !== "string"
        ) {
            return fallback;
        }

        const cleaned =
            name.trim();

        return cleaned.length > 0
            ? cleaned
            : fallback;
    }


    function normalizeType(type) {

        type =
            String(type || "")
                .toLowerCase()
                .trim();

        return CONFIG.validTypes.includes(type)
            ? type
            : CONFIG.defaultType;
    }


    /* --------------------------------------------------------
       PLAYER CLASS
       -------------------------------------------------------- */

    class Player {

        constructor(options) {

            options = options || {};


            /* ------------------------------------------------
               IDENTITY
               ------------------------------------------------ */

            this.id =
                options.id ||
                "player-" + nextPlayerId++;


            this.name =
                cleanName(
                    options.name,
                    CONFIG.defaultName
                );


            this.type =
                normalizeType(
                    options.type
                );


            this.level =
                Math.max(
                    1,
                    toNumber(
                        options.level,
                        CONFIG.defaultLevel
                    )
                );


            /* ------------------------------------------------
               SCORE / RECORD
               ------------------------------------------------ */

            this.score =
                toNumber(
                    options.score,
                    0
                );


            this.wins =
                toNumber(
                    options.wins,
                    0
                );


            this.losses =
                toNumber(
                    options.losses,
                    0
                );


            this.draws =
                toNumber(
                    options.draws,
                    0
                );


            /* ------------------------------------------------
               TURN STATE
               ------------------------------------------------ */

            this.isActive =
                Boolean(
                    options.isActive
                );


            this.isCurrent =
                Boolean(
                    options.isCurrent
                );


            this.turns =
                toNumber(
                    options.turns,
                    0
                );


            /* ------------------------------------------------
               GAME METADATA
               ------------------------------------------------ */

            this.color =
                options.color ||
                null;


            this.avatar =
                options.avatar ||
                null;


            this.team =
                options.team ||
                null;


            this.metadata =
                Object.assign(
                    {},
                    options.metadata || {}
                );


            /* ------------------------------------------------
               CUSTOM STATE
               ------------------------------------------------ */

            this.state =
                Object.assign(
                    {},
                    options.state || {}
                );
        }


        /* ----------------------------------------------------
           TYPE
           ---------------------------------------------------- */

        isHuman() {

            return this.type === "human";
        }


        isAI() {

            return this.type === "ai";
        }


        setType(type) {

            this.type =
                normalizeType(type);

            return this;
        }


        /* ----------------------------------------------------
           NAME
           ---------------------------------------------------- */

        setName(name) {

            this.name =
                cleanName(
                    name,
                    this.name
                );

            return this;
        }


        /* ----------------------------------------------------
           LEVEL
           ---------------------------------------------------- */

        setLevel(level) {

            this.level =
                Math.max(
                    1,
                    toNumber(
                        level,
                        this.level
                    )
                );

            return this;
        }


        /* ----------------------------------------------------
           SCORE
           ---------------------------------------------------- */

        addScore(points) {

            points =
                toNumber(
                    points,
                    0
                );

            this.score += points;

            return this;
        }


        subtractScore(points) {

            points =
                Math.max(
                    0,
                    toNumber(
                        points,
                        0
                    )
                );

            this.score =
                Math.max(
                    0,
                    this.score - points
                );

            return this;
        }


        setScore(score) {

            this.score =
                toNumber(
                    score,
                    this.score
                );

            return this;
        }


        resetScore() {

            this.score = 0;

            return this;
        }


        /* ----------------------------------------------------
           RECORD
           ---------------------------------------------------- */

        recordWin() {

            this.wins++;

            return this;
        }


        recordLoss() {

            this.losses++;

            return this;
        }


        recordDraw() {

            this.draws++;

            return this;
        }


        resetRecord() {

            this.wins = 0;

            this.losses = 0;

            this.draws = 0;

            return this;
        }


        getGamesPlayed() {

            return (
                this.wins +
                this.losses +
                this.draws
            );
        }


        getWinRate() {

            const games =
                this.getGamesPlayed();

            if (games <= 0) {
                return 0;
            }

            return (
                this.wins / games
            ) * 100;
        }


        /* ----------------------------------------------------
           TURN
           ---------------------------------------------------- */

        startTurn() {

            this.isCurrent = true;

            this.isActive = true;

            this.turns++;

            return this;
        }


        endTurn() {

            this.isCurrent = false;

            return this;
        }


        /* ----------------------------------------------------
           ACTIVE STATE
           ---------------------------------------------------- */

        activate() {

            this.isActive = true;

            return this;
        }


        deactivate() {

            this.isActive = false;

            this.isCurrent = false;

            return this;
        }


        /* ----------------------------------------------------
           CUSTOM STATE
           ---------------------------------------------------- */

        setState(key, value) {

            if (
                typeof key !== "string" ||
                key.length === 0
            ) {
                return this;
            }

            this.state[key] = value;

            return this;
        }


        getState(key, fallback) {

            if (
                Object.prototype.hasOwnProperty.call(
                    this.state,
                    key
                )
            ) {
                return this.state[key];
            }

            return fallback;
        }


        removeState(key) {

            delete this.state[key];

            return this;
        }


        clearState() {

            this.state = {};

            return this;
        }


        /* ----------------------------------------------------
           METADATA
           ---------------------------------------------------- */

        setMetadata(key, value) {

            if (
                typeof key !== "string" ||
                key.length === 0
            ) {
                return this;
            }

            this.metadata[key] = value;

            return this;
        }


        getMetadata(key, fallback) {

            if (
                Object.prototype.hasOwnProperty.call(
                    this.metadata,
                    key
                )
            ) {
                return this.metadata[key];
            }

            return fallback;
        }


        /* ----------------------------------------------------
           SNAPSHOT
           ---------------------------------------------------- */

        toJSON() {

            return {
                id: this.id,

                name: this.name,

                type: this.type,

                level: this.level,

                score: this.score,

                wins: this.wins,

                losses: this.losses,

                draws: this.draws,

                isActive: this.isActive,

                isCurrent: this.isCurrent,

                turns: this.turns,

                color: this.color,

                avatar: this.avatar,

                team: this.team,

                metadata:
                    Object.assign(
                        {},
                        this.metadata
                    ),

                state:
                    Object.assign(
                        {},
                        this.state
                    )
            };
        }
    }


    /* --------------------------------------------------------
       PLAYER MANAGER
       -------------------------------------------------------- */

    class PlayerManager {

        constructor(options) {

            options = options || {};

            this.players = [];

            this.currentIndex = -1;

            this.maxPlayers =
                Math.max(
                    1,
                    toNumber(
                        options.maxPlayers,
                        CONFIG.maxPlayers
                    )
                );

            this.gameId =
                options.gameId ||
                null;

            this.events = {
                add: [],
                remove: [],
                change: [],
                turnStart: [],
                turnEnd: [],
                win: [],
                loss: [],
                draw: [],
                reset: []
            };
        }


        /* ----------------------------------------------------
           EVENTS
           ---------------------------------------------------- */

        on(event, callback) {

            if (
                !this.events[event] ||
                typeof callback !== "function"
            ) {
                return this;
            }

            this.events[event].push(callback);

            return this;
        }


        off(event, callback) {

            if (!this.events[event]) {
                return this;
            }

            if (!callback) {
                this.events[event] = [];

                return this;
            }

            this.events[event] =
                this.events[event].filter(
                    function (fn) {
                        return fn !== callback;
                    }
                );

            return this;
        }


        emit(event, data) {

            const list =
                this.events[event];

            if (!list) {
                return;
            }

            list.slice().forEach(
                function (callback) {

                    try {

                        callback(
                            data,
                            this
                        );

                    } catch (error) {

                        console.error(
                            "👤 RO'Lyfe Player System callback error:",
                            error
                        );
                    }

                }.bind(this)
            );
        }


        /* ----------------------------------------------------
           ADD PLAYER
           ---------------------------------------------------- */

        add(options) {

            if (
                this.players.length >=
                this.maxPlayers
            ) {

                console.warn(
                    "👤 RO'Lyfe Player System: maximum players reached."
                );

                return null;
            }


            const player =
                options instanceof Player
                    ? options
                    : new Player(options);


            if (
                this.getById(player.id)
            ) {

                console.warn(
                    "👤 RO'Lyfe Player System: duplicate player ID."
                );

                return null;
            }


            this.players.push(player);

            if (
                this.currentIndex === -1
            ) {
                this.currentIndex = 0;
            }

            this.emit(
                "add",
                player
            );

            this.emit(
                "change",
                this.getState()
            );

            return player;
        }


        /* ----------------------------------------------------
           REMOVE PLAYER
           ---------------------------------------------------- */

        remove(id) {

            const index =
                this.players.findIndex(
                    function (player) {
                        return player.id === id;
                    }
                );


            if (index === -1) {
                return false;
            }


            const removed =
                this.players[index];


            const wasCurrent =
                index === this.currentIndex;


            this.players.splice(
                index,
                1
            );


            if (
                this.players.length === 0
            ) {

                this.currentIndex = -1;

            } else if (
                index < this.currentIndex
            ) {

                this.currentIndex--;

            } else if (
                this.currentIndex >=
                this.players.length
            ) {

                this.currentIndex =
                    this.players.length - 1;
            }


            if (
                wasCurrent &&
                this.players.length > 0
            ) {

                this.players.forEach(
                    function (player) {
                        player.isCurrent = false;
                    }
                );

                this.players[
                    this.currentIndex
                ].isCurrent = true;
            }


            this.emit(
                "remove",
                removed
            );

            this.emit(
                "change",
                this.getState()
            );

            return true;
        }


        /* ----------------------------------------------------
           CLEAR
           ---------------------------------------------------- */

        clear() {

            this.players.forEach(
                function (player) {
                    player.deactivate();
                }
            );

            this.players = [];

            this.currentIndex = -1;

            this.emit(
                "change",
                this.getState()
            );

            return this;
        }


        /* ----------------------------------------------------
           LOOKUPS
           ---------------------------------------------------- */

        getById(id) {

            return (
                this.players.find(
                    function (player) {
                        return player.id === id;
                    }
                ) || null
            );
        }


        getByName(name) {

            const target =
                String(name || "")
                    .trim()
                    .toLowerCase();

            return (
                this.players.find(
                    function (player) {
                        return (
                            player.name
                                .toLowerCase() ===
                            target
                        );
                    }
                ) || null
            );
        }


        get(index) {

            if (
                index < 0 ||
                index >= this.players.length
            ) {
                return null;
            }

            return this.players[index];
        }


        getAll() {

            return this.players.slice();
        }


        getHumans() {

            return this.players.filter(
                function (player) {
                    return player.isHuman();
                }
            );
        }


        getAI() {

            return this.players.filter(
                function (player) {
                    return player.isAI();
                }
            );
        }


        count() {

            return this.players.length;
        }


        /* ----------------------------------------------------
           CURRENT PLAYER
           ---------------------------------------------------- */

        getCurrent() {

            if (
                this.currentIndex < 0 ||
                this.currentIndex >=
                    this.players.length
            ) {
                return null;
            }

            return this.players[
                this.currentIndex
            ];
        }


        setCurrent(idOrIndex) {

            let index = -1;


            if (
                typeof idOrIndex === "number"
            ) {

                index =
                    Math.floor(
                        idOrIndex
                    );

            } else {

                index =
                    this.players.findIndex(
                        function (player) {
                            return (
                                player.id ===
                                idOrIndex
                            );
                        }
                    );
            }


            if (
                index < 0 ||
                index >= this.players.length
            ) {
                return null;
            }


            this.players.forEach(
                function (player) {

                    player.isCurrent =
                        false;

                }
            );


            const previous =
                this.getCurrent();


            this.currentIndex = index;


            const current =
                this.players[index];


            current.isCurrent = true;


            this.emit(
                "change",
                {
                    previous: previous,
                    current: current
                }
            );


            return current;
        }


        /* ----------------------------------------------------
           START TURN
           ---------------------------------------------------- */

        startTurn(idOrIndex) {

            const previous =
                this.getCurrent();


            const current =
                this.setCurrent(
                    idOrIndex
                );


            if (!current) {
                return null;
            }


            if (
                previous &&
                previous !== current
            ) {

                previous.endTurn();

                this.emit(
                    "turnEnd",
                    previous
                );
            }


            current.startTurn();


            this.emit(
                "turnStart",
                current
            );


            return current;
        }


        /* ----------------------------------------------------
           END TURN
           ---------------------------------------------------- */

        endTurn() {

            const current =
                this.getCurrent();


            if (!current) {
                return null;
            }


            current.endTurn();


            this.emit(
                "turnEnd",
                current
            );


            return current;
        }


        /* ----------------------------------------------------
           NEXT PLAYER
           ---------------------------------------------------- */

        next(options) {

            options = options || {};

            const includeInactive =
                Boolean(
                    options.includeInactive
                );


            const count =
                this.players.length;


            if (count === 0) {
                return null;
            }


            let index =
                this.currentIndex;


            for (
                let step = 0;
                step < count;
                step++
            ) {

                index =
                    (index + 1) % count;


                const player =
                    this.players[index];


                if (
                    includeInactive ||
                    player.isActive
                ) {

                    return this.startTurn(
                        index
                    );
                }
            }


            return null;
        }


        /* ----------------------------------------------------
           PREVIOUS PLAYER
           ---------------------------------------------------- */

        previous(options) {

            options = options || {};

            const includeInactive =
                Boolean(
                    options.includeInactive
                );


            const count =
                this.players.length;


            if (count === 0) {
                return null;
            }


            let index =
                this.currentIndex;


            for (
                let step = 0;
                step < count;
                step++
            ) {

                index =
                    (index - 1 + count) %
                    count;


                const player =
                    this.players[index];


                if (
                    includeInactive ||
                    player.isActive
                ) {

                    return this.startTurn(
                        index
                    );
                }
            }


            return null;
        }


        /* ----------------------------------------------------
           RESULTS
           ---------------------------------------------------- */

        recordWin(idOrIndex) {

            const player =
                this.resolve(
                    idOrIndex
                );

            if (!player) {
                return null;
            }

            player.recordWin();

            this.emit(
                "win",
                player
            );

            this.emit(
                "change",
                this.getState()
            );

            return player;
        }


        recordLoss(idOrIndex) {

            const player =
                this.resolve(
                    idOrIndex
                );

            if (!player) {
                return null;
            }

            player.recordLoss();

            this.emit(
                "loss",
                player
            );

            this.emit(
                "change",
                this.getState()
            );

            return player;
        }


        recordDraw(idOrIndex) {

            const player =
                this.resolve(
                    idOrIndex
                );

            if (!player) {
                return null;
            }

            player.recordDraw();

            this.emit(
                "draw",
                player
            );

            this.emit(
                "change",
                this.getState()
            );

            return player;
        }


        /* ----------------------------------------------------
           SCORE
           ---------------------------------------------------- */

        addScore(idOrIndex, points) {

            const player =
                this.resolve(
                    idOrIndex
                );

            if (!player) {
                return null;
            }

            player.addScore(points);

            this.emit(
                "change",
                this.getState()
            );

            return player;
        }


        setScore(idOrIndex, score) {

            const player =
                this.resolve(
                    idOrIndex
                );

            if (!player) {
                return null;
            }

            player.setScore(score);

            this.emit(
                "change",
                this.getState()
            );

            return player;
        }


        /* ----------------------------------------------------
           RESET SCORES / RECORD
           ---------------------------------------------------- */

        resetScores() {

            this.players.forEach(
                function (player) {
                    player.resetScore();
                }
            );

            this.emit(
                "reset",
                this.getState()
            );

            return this;
        }


        resetRecords() {

            this.players.forEach(
                function (player) {
                    player.resetRecord();
                }
            );

            this.emit(
                "reset",
                this.getState()
            );

            return this;
        }


        resetAll() {

            this.players.forEach(
                function (player) {

                    player.resetScore();

                    player.resetRecord();

                    player.turns = 0;

                    player.deactivate();

                }
            );


            this.currentIndex =
                this.players.length > 0
                    ? 0
                    : -1;


            if (
                this.currentIndex >= 0
            ) {

                this.players[
                    this.currentIndex
                ].isActive = true;
            }


            this.emit(
                "reset",
                this.getState()
            );


            return this;
        }


        /* ----------------------------------------------------
           RESOLVE PLAYER
           ---------------------------------------------------- */

        resolve(idOrIndex) {

            if (
                idOrIndex instanceof Player
            ) {
                return idOrIndex;
            }


            if (
                typeof idOrIndex === "number"
            ) {
                return this.get(
                    idOrIndex
                );
            }


            return this.getById(
                idOrIndex
            );
        }


        /* ----------------------------------------------------
           STATE
           ---------------------------------------------------- */

        getState() {

            return {
                gameId: this.gameId,

                playerCount:
                    this.players.length,

                currentIndex:
                    this.currentIndex,

                currentPlayer:
                    this.getCurrent()
                        ? this.getCurrent()
                            .toJSON()
                        : null,

                players:
                    this.players.map(
                        function (player) {
                            return player.toJSON();
                        }
                    )
            };
        }


        /* ----------------------------------------------------
           SERIALIZATION
           ---------------------------------------------------- */

        toJSON() {

            return this.getState();
        }


        /* ----------------------------------------------------
           LOAD SNAPSHOT
           ---------------------------------------------------- */

        load(snapshot) {

            if (
                !snapshot ||
                !Array.isArray(
                    snapshot.players
                )
            ) {
                return this;
            }


            this.clear();


            snapshot.players
                .slice(
                    0,
                    this.maxPlayers
                )
                .forEach(
                    function (data) {

                        this.add(
                            new Player(data)
                        );

                    }.bind(this)
                );


            if (
                Number.isInteger(
                    snapshot.currentIndex
                ) &&
                snapshot.currentIndex >= 0 &&
                snapshot.currentIndex <
                    this.players.length
            ) {

                this.setCurrent(
                    snapshot.currentIndex
                );
            }


            return this;
        }
    }


    /* --------------------------------------------------------
       FACTORY
       -------------------------------------------------------- */

    function create(options) {

        return new PlayerManager(
            options
        );
    }


    function createPlayer(options) {

        return new Player(
            options
        );
    }


    /* --------------------------------------------------------
       PUBLIC API
       -------------------------------------------------------- */

    const ROLyfePlayers = {

        Player: Player,

        PlayerManager:
            PlayerManager,

        create: create,

        createPlayer:
            createPlayer,

        config:
            Object.assign(
                {},
                CONFIG
            ),

        version: "1.0"
    };


    /* --------------------------------------------------------
       GLOBAL EXPORT
       -------------------------------------------------------- */

    global.ROLyfePlayers =
        ROLyfePlayers;


    /*
       Compatibility alias.
    */

    global.ROlyfePlayers =
        ROLyfePlayers;


    /* --------------------------------------------------------
       READY MESSAGE
       -------------------------------------------------------- */

    console.log(
        "👤 RO'Lyfe Player System v1.0 loaded."
    );


})(window);
