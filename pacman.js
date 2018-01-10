/* global requestAnimationFrame */

(function() {

  // Game object which controls the animations and rules of the game
  // and is the parent of all the character objects in the game.
  // This allows for reseting and tracking of the game state.
  var Game = function(canvasId) {
    var canvas = document.getElementById(canvasId);
    var ctx = canvas.getContext('2d');

    this.lives = 3;
    this.timer = 0;
    this.pathState = 'scatter';
    this.pathChangeInc = 0;

    var self = this;

    // In ES6 these could be changed to arrow functions to avoid the
    // scope issues, and requirement for self = this;
    this.reset = function() {
      self.timer = 0;
      self.pathState = 'scatter';
      self.pathChangeInc = 0;
      self.pacman = new Pacman(ctx, gameSize, self.world, self.lives);
      self.ghosts = createGhosts(ctx, this.world);
    };

    // On initiating create a new grid for the game, and then create world
    // from that grid, to render to the browser
    this.grid = new Grid();
    this.world = createWorld(ctx, this.grid);
    this.reset();

    canvas.width = this.grid.width * 20;
    canvas.height= this.grid.height * 20;
    var gameSize = {x: canvas.width, y: canvas.height};

    var fps = 60;

    // Main game loop
    var tick = function() {
      self.update(ctx);
      if (self.pacman.lives >= 0) {
         self.draw(ctx, gameSize);
         setTimeout(function () {
             requestAnimationFrame(tick);
         }, 1000 / fps);
      } else {
        $('#game-over').show();
      }
    };
    tick();
  };

  Game.prototype = {
    //Game object handles the updating of the location of the ghosts and Mr. Pac
    update: function(game) {
      if (!this.pacman.alive) {
        this.reset()
      };
      // The ghosts start in scatter mode, but after 7 seconds, begin chasing
      // pacman.
      this.checkPathChange();
      this.pacman.update(game, this.pacman, this.world);
      for (var i = 0; i < this.ghosts.length; i++) {
        // 'game' = context for rendering, this = Game Object for grid access
        this.ghosts[i].update(game, this.ghosts[i], this.world, this);
      };

      updateScore(score);
    },

    checkPathChange: function() {
      this.timer += 1 / 60;
      if (this.timer >= 7 && this.pathState == 'scatter' && this.pathChangeInc == 0) {
        this.pathState = 'chase';
        this.pathChangeInc += 1;
      } else if (this.timer >= 27 && this.pathState == 'chase' && this.pathChangeInc == 1) {
        this.pathState = 'scatter';
        this.pathChangeInc -= 1;
        this.timer = 0;
      }
    },

    draw: function(game, gameSize) {
      game.clearRect(0, 0, gameSize.x, gameSize.y);
      game.fillStyle = "black";
      game.fillRect(0, 0, gameSize.x, gameSize.y);
      for (var i = 0; i < this.world.length; i++) {
          this.world[i].draw();
      };
      this.pacman.draw();
      for (var i = 0; i < this.ghosts.length; i++) {
        this.ghosts[i].draw(game, this.ghosts[i], this.ghosts[i].color);
      };

      for (var i = 0; i < this.pacman.lives; i++) {
        drawGameObj(game, {size:{x: 18, y: 18}, center:{x:(2+(2*i))*20,y: 34*20}}, "#FFEE00")
      };

      //Update score
      game.font = '30px fantasy';
      game.textAlign = 'center';
      game.fillStyle = '#ffffff';
      var scoreText = "Score: " + score;
      game.fillText(scoreText, 14*20, 30);
    }
  };

    // Pacman object containing all his properties and functions for movement
    // Controlled by the Game Object
    var Pacman = function(game, gameSize, world, lives) {
      this.game = game;
      this.size = {x: 20, y: 20};
      this.center = {x: 14*20, y: 25.5*20};

      this.direction = null;
      this.velocity = {x: 0, y:0};

      this.alive = true;
      this.lives = lives;
      this.world = world;

      this.canMove = true;
      this.keyboarder = new Keyboarder();
    };

    Pacman.prototype = {
      update: function (game, pacman, world) {

        if (pacman.keyboarder.isDown(pacman.keyboarder.KEYS.LEFT))
          pacman.direction = 'left'
        else if (pacman.keyboarder.isDown(pacman.keyboarder.KEYS.RIGHT))
          pacman.direction = 'right'
        else if (pacman.keyboarder.isDown(pacman.keyboarder.KEYS.UP))
          pacman.direction = 'up'
        else if (pacman.keyboarder.isDown(pacman.keyboarder.KEYS.DOWN))
          pacman.direction = 'down'

        checkCollision(game, pacman.direction, pacman, world);
        // Keyboard changes the state of Pacman's direction, this loop below
        // controls his velocity based on that direction. This loop can be
        // used to avoid him 'stopping' on walls when a button is pressed
        // soon by allowing a queue - future change required.
        if (pacman.canMove) {
          if (pacman.direction == 'left') {
            pacman.velocity.x = -2;
            pacman.velocity.y = 0;
          } else if (pacman.direction == 'right') {
            pacman.velocity.x = 2;
            pacman.velocity.y = 0;
          } else if (pacman.direction == 'up') {
            pacman.velocity.y = -2;
            pacman.velocity.x = 0;
          } else if (pacman.direction == 'down') {
            pacman.velocity.y = 2;
            pacman.velocity.x = 0;
          }
        } else {
          if (pacman.direction == 'left' || pacman.direction == 'right')
              pacman.velocity.x = 0;
          else if(pacman.direction == 'up' || pacman.direction == 'down')
              pacman.velocity.y = 0;
        };

        pacman.center.x += pacman.velocity.x
        pacman.center.y += pacman.velocity.y
      },
      draw: function () {
        if (this.alive)
          drawGameObj(this.game, this, "#FFEE00");
      }
    };

  // Object for each individual Ghost in the game. Controls all their
  // properties like direction, velocity and target cell.
  var Ghost = function(game, world, center, color, id) {
    this.game = game;
    this.size = {x:20, y:20};
    this.center = center;
    this.world = world;
    this.color = color; //    ghostColors = ['pink', 'orange', 'red','aqua'];
    this.ghostID = id;

    this.direction = 'up';

    // Initial targets for when the ghosts are in 'scatter' mode. These
    // targets will cause the ghosts to rotate in one of the four corners
    // perpetually.
    targets = [{center:{x:2*20 , y: 0*20 }},
               {center:{x:0*20 , y:33*20 }},
               {center:{x:25*20, y: 0*20 }},
               {center:{x:27*20, y:33*20 }}];
    this.canMove = true;
    this.target = null;
    //assigns each of the ghosts to one of the four corners as per above
    this.baseTargetCell = targets[id];

    //Function for finding pacman's path
    var getPacmanTilePath = function(pacman, tileInc) {
      if (pacman.direction == null) {
        var pacmanDir = 'left';
      } else {
        var pacmanDir = pacman.direction;
      };
      var targetCell = {};
      targetCell.center = Object.assign({}, pacman.center);
      if (pacmanDir == 'left') {
        targetCell.center.x += -tileInc*20;
      } else if (pacmanDir == 'right') {
        targetCell.center.x += tileInc*20;
      } else if (pacmanDir == 'up') {
        targetCell.center.y += -tileInc*20;
      } else if (pacmanDir == 'down') {
        targetCell.center.y += tileInc*20;
      }
      return targetCell;
    }

    //finds target cell when the ghosts aren't in 'scatter' mode
    //Each ghost has a unique targetting algorithm as described
    //in the comments below
    this.targetCell = function (GAME) {
      //Red's target is always pacman
      if (this.color == 'red')
      {
        return GAME.pacman;
      }
      //Pink targets 4 tiles in front of pacman's current orientation
      else if (this.color == 'pink') {
        return getPacmanTilePath(GAME.pacman, 4);
      }
      // Blue/Aquas target is a vector drawn between red ghost and a target
      // 2 tiles in front of pacman, times 2.
      else if (this.color == 'aqua') {

        var tCell = getPacmanTilePath(GAME.pacman, 2); // target cell 2 in front of pacman
        var rLoc = Object.assign({}, GAME.ghosts[2].center); // red ghost Location

        // Find x and y values of the vector drawn between rLoc and tCell
        var xDif = targetCell.center.x - rLoc.x;
        var yDif = targetCell.center.y - rLoc.y;
        // Add this value to tCell again to double the vector

        targetCell.center.x += xDif;
        targetCell.center.y += yDif;
        return targetCell;

      //Orange is timid and will only pursue pacman if he is at least 8
      //cells away, otherwise he reverts to his base target cell
      //meaning he'll pursue pacman until he gets too close then he runs
      } else if (this.color == 'orange') {
        var deltaX = GAME.pacman.center.x - this.center.x;
        var deltaY = GAME.pacman.center.y - this.center.y;
        var distanceVector = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2))
        if (distanceVector/20 > 8)
          return GAME.pacman;
        else {
          return this.baseTargetCell
        }
      }
    }

    this.reachedTarget = function () {
      var coordinates = getCoordinates(this);
      //targets x and y will always be the top left corner
      var targetCoordinates = {
        topLeftCorner: {x: this.target.x*20, y: this.target.y*20},
        topRightCorner: {x: (this.target.x+1)*20, y: this.target.y*20},
        bottomLeftCorner: {x: this.target.x*20, y: (this.target.y+1)*20},
        bottomRightCorner: {x: (this.target.x+1)*20, y: (this.target.y+1)*20}};

      return (coordinates.topLeftCorner.x >= (targetCoordinates.topLeftCorner.x-2) &&
          coordinates.topRightCorner.x <= (targetCoordinates.topRightCorner.x+2) &&
          coordinates.bottomLeftCorner.y <= (targetCoordinates.bottomLeftCorner.y+2) &&
          coordinates.topLeftCorner.y >= (targetCoordinates.topLeftCorner.y-2))
    };
  };

  Ghost.prototype = {
    update: function (game, ghost, world, GAME) {
      //Target can be removed to set the Ghost's 'status' to scatter
      //as per original Pacman code. And then simply add a target
      //once more to get it to chase pacman again
      if (!ghost.target)
        if (GAME.pathState == 'scatter') {
          if (GAME.grid.gridState[Math.floor(ghost.center.y/20)][Math.floor(ghost.center.x/20)] == GAME.grid.gridKeys['JAIL']) {
            //This code helps lead the ghost out of the Jail when they are in JAIL
            //Target is just outside of jail
            pathfinder(ghost, {center: {x: 14*20, y:13*20}}, GAME.grid);
          }
          else {
            //format: pathfinder(vehicle, target, grid)
            pathfinder(ghost, ghost.baseTargetCell, GAME.grid);
          }
        }
        else if (GAME.pathState == 'chase') {
          //Find pacman based on unique targetting scheme
          pathfinder(ghost, ghost.targetCell(GAME), GAME.grid);
        }

      if (ghost.reachedTarget()) {
        ghost.target = null;
      }

      checkCollision(game, ghost.direction, ghost, world);

      if (ghost.canMove) {
        if (ghost.direction == 'up') {
          ghost.center.y -= 2
        } else if (ghost.direction == 'down') {
          ghost.center.y += 2
        } else if (ghost.direction == 'right') {
          ghost.center.x += 2
        } else if (ghost.direction == 'left') {
          ghost.center.x -= 2
        }
      };

      if (isTouching(ghost, GAME.pacman)) {
        GAME.pacman.alive = false;
        GAME.lives -= 1;
      };
    },
    draw: function(game, ghost, color) {
      drawGameObj(game, ghost, color);
    }
  };

  var Dot = function(game, center) {
    this.game = game;
    this.size = {x: 5, y: 5};
    this.center = center;
  };

  Dot.prototype = {
    draw: function(game) {
        drawGameObj(this.game, this, "white");
    }
  };

  var Wall = function(game, center){
    this.game = game;
    this.size = {x:19, y:19};
    this.center = center;
  };

  Wall.prototype = {
      draw: function(game) {
          drawGameObj(this.game, this, "blue");
      }
  };

  // The grid object controls all the initial state of the graphics
  // prior to rendering to the screen
  var Grid = function() {
    this.gridKeys = {
            'DOT': 0,
            'WALL': 1,
            'SPAWN':2,
            'JAIL': 8,
            'NULL': 9
    };
    this.gridState = [[9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
                      [9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
                      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                      [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
                      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
                      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
                      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
                      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                      [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
                      [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
                      [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
                      [1,1,1,1,1,1,0,1,1,1,1,1,9,1,1,9,1,1,1,1,1,0,1,1,1,1,1,1],
                      [1,9,9,9,9,1,0,1,1,1,1,1,9,1,1,9,1,1,1,1,1,0,1,9,9,9,9,1],
                      [1,9,9,9,9,1,0,1,1,9,9,9,9,9,9,9,9,9,9,1,1,0,1,9,9,9,9,1],
                      [1,9,9,9,9,1,0,1,1,9,1,1,1,8,8,1,1,1,9,1,1,0,1,9,9,9,9,1],
                      [1,1,1,1,1,1,0,1,1,9,1,8,8,8,8,8,8,1,9,1,1,0,1,1,1,1,1,1],
                      [1,9,9,9,9,1,0,9,9,9,1,8,8,8,8,8,8,1,9,9,9,0,1,9,9,9,9,1],
                      [1,1,1,1,1,1,0,1,1,9,1,8,8,8,8,8,8,1,9,1,1,0,1,1,1,1,1,1],
                      [1,9,9,9,9,1,0,1,1,9,1,1,1,1,1,1,1,1,9,1,1,0,1,9,9,9,9,1],
                      [1,9,9,9,9,1,0,1,1,9,9,9,9,9,9,9,9,9,9,1,1,0,1,9,9,9,9,1],
                      [1,9,9,9,9,1,0,1,1,9,1,1,1,1,1,1,1,1,9,1,1,0,1,9,9,9,9,1],
                      [1,1,1,1,1,1,0,1,1,9,1,1,1,1,1,1,1,1,9,1,1,0,1,1,1,1,1,1],
                      [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
                      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
                      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
                      [1,0,0,0,1,1,0,0,0,0,0,0,0,9,9,0,0,0,0,0,0,0,1,1,0,0,0,1],
                      [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
                      [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
                      [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
                      [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
                      [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
                      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                      [9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
                      [9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9]];

    this.height = this.gridState.length;
    this.width = this.gridState[0].length;
  };

  var Keyboarder = function() {
    var keyState = {};

    window.onkeydown = function(event) {
        keyState[event.keyCode] = true;
    };

    window.onkeyup = function(event) {
        keyState[event.keyCode] = false;
    };

    this.isDown = function(keyCode) {
        return keyState[keyCode] === true;
    };

    this.KEYS = { LEFT:37, UP: 38, RIGHT: 39, DOWN: 40};
  };

  // Converts the grid into the playable world in the browser
  var createWorld = function(game, grid) {
    var world = [];

    for (var i = 0; i<grid.width; i++) {
        for (var j = 0; j<grid.height; j++) {
    if (grid.gridState[j][i] == grid.gridKeys['DOT']) {
      var x = i*20 + 10;
      var y = j*20 + 10;
      world.push(new Dot(game, {x:x, y:y}))
    } else if (grid.gridState[j][i] == grid.gridKeys['WALL']) {
      var x = i*20 + 10;
      var y = j*20 + 10;
      world.push(new Wall(game, {x:x, y:y}))
    };
        };
    };
    return world;
  };

  var createGhosts = function(game, world) {
    ghostSpawns = [{x:14.5*20, y:16.5*20},
                   {x:12.5*20, y:16.5*20},
                   {x:16.5*20, y:16.5*20},
                   {x:14*20, y:13.5*20}];

    ghostColors = ['pink', 'orange', 'red','aqua'];

    ghosts = [];
    for (var i = 0; i < ghostColors.length; i++) {
      ghosts.push(new Ghost(game, world, ghostSpawns[i], ghostColors[i], i));
    };

    return ghosts;
  };

  var checkCollision = function(game, direction, vehicle, world) {
    vehicle.canMove = true;

    var hasCollided = function(d, obj, vehicle) {
      if (d == 'left') {
        if (isTouching(obj, {center: {x:vehicle.center.x-2, y: vehicle.center.y}, size: vehicle.size})) {
          return true;
        };
      } else if (d == 'right') {
        if (isTouching(obj, {center: {x:vehicle.center.x+2, y: vehicle.center.y}, size: vehicle.size})) {
          return true;
        };
      } else if (d == 'down') {
        if (isTouching(obj, {center: {x:vehicle.center.x, y: vehicle.center.y+2}, size: vehicle.size}))  {
          return true;
        };
      } else if (d == 'up') {
        if (isTouching(obj, {center: {x:vehicle.center.x, y: vehicle.center.y-2}, size: vehicle.size})) {
          return true;
        };
      };
      return false;
    };

    for (var i = 0; i < world.length; i++) {
      if (world[i] instanceof Dot && vehicle instanceof Pacman) {
        var dot = world[i];
        if (hasCollided(direction, dot, vehicle)) {
            world.splice(i, 1);
            score += 1;
        }
      } else if (world[i] instanceof Wall) {
        var wall = world[i];
        if (hasCollided(direction, wall, vehicle)) {
            vehicle.canMove = false;
        }
      };
    };
  };

  //Function used to control all ghost movement in the game
  var pathfinder = function (vehicle, target, grid) {

    var distances = {left: null,
                     right: null,
                     up: null,
                     down: null};

    var targetLocation = { x: Math.floor(target.center.x / 20),
                           y: Math.floor(target.center.y / 20)};

    var vehicleLocation = { x: Math.floor(vehicle.center.x / 20),
                            y: Math.floor(vehicle.center.y / 20)};

    var directions = {left: {x: vehicleLocation.x-1, y:vehicleLocation.y},
                      right: {x:vehicleLocation.x+1, y:vehicleLocation.y},
                      up: {x:vehicleLocation.x, y:vehicleLocation.y-1},
                      down: {x:vehicleLocation.x, y:vehicleLocation.y+1}};

    var nodeTypes = {left: grid.gridState[directions.left.y][directions.left.x],
                     right: grid.gridState[directions.right.y][directions.right.x],
                     up: grid.gridState[directions.up.y][directions.up.x],
                     down: grid.gridState[directions.down.y][directions.down.x]};

    var currentDirection = vehicle.direction;

    //Used to avoid allowing the ghosts to reverse direction
    if (currentDirection == 'left')
      var reverse = 'right'
    else if (currentDirection == 'right')
      var reverse = 'left'
    else if (currentDirection == 'down')
      var reverse = 'up'
    else if (currentDirection == 'up')
      var reverse = 'down'

    var distanceVector = function (i1, j1, i2, j2) {
      /* finds distance to center of a block */
      var deltaX = i1 - i2;
      var deltaY = j1 - j2;

      // a^2 + b2 = c^2 -> c = sqrt(a^2 + b^2)
      return Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
    };

    //This loop calculates the distances to the target location in all directions,
    //to help the ghost find the shortest path to its target
    for (var direction in directions) {
      //Will not let the ghost reverse, which is a rule of Pacman (would be too difficult otherwise)
      if (directions.hasOwnProperty(direction) && direction != reverse) {
        var blockType = nodeTypes[direction];
        if (blockType != grid.gridKeys['WALL'] && blockType != grid.gridKeys['JAIL']) {
          distances[direction] = distanceVector(directions[direction].x, directions[direction].y, targetLocation.x, targetLocation.y);
         }
        else if (grid.gridState[vehicleLocation.y][vehicleLocation.x] == grid.gridKeys['JAIL'] && blockType != grid.gridKeys['WALL']) {
          distances[direction] = distanceVector(directions[direction].x, directions[direction].y, targetLocation.x, targetLocation.y);
        };
      };
    };

    for (var key in distances) {
      if (distances.hasOwnProperty(key)) {
        if (distances[key] != null) {
          //shortest will help the object find the shortest direction to its target
          //traditional Pacman used a straight vector, rather than a* pathfinding
          if (shortest == undefined)
            var shortest = key
          if (distances[shortest] > distances[key])
            shortest = key
        };
      };
    };

    checkCollision(vehicle.game, shortest, vehicle, vehicle.world);
    if (vehicle.canMove) {
      vehicle.direction = shortest;
      vehicle.target = directions[shortest];
    }
  };

  var updateScore = function(score) {
    //x = 14.5 y = 0
    var ele = document.getElementById("score");
    ele.textContent = score;
  };

  var getCoordinates = function(obj) {
    return {topLeftCorner: {x: obj.center.x - obj.size.x/2, y: obj.center.y - obj.size.y/2},
        topRightCorner: {x: obj.center.x + obj.size.x/2, y: obj.center.y - obj.size.y/2},
        bottomLeftCorner: {x: obj.center.x - obj.size.x/2, y: obj.center.y + obj.size.y/2},
        bottomRightCorner: {x: obj.center.x + obj.size.x/2, y: obj.center.y + obj.size.y/2}
        };
  };

  var drawGameObj = function(game, obj, color) {
    game.fillStyle = color;
    game.fillRect(obj.center.x - obj.size.x/2, obj.center.y - obj.size.y/2, obj.size.x, obj.size.y)
  };

  var isTouching = function(obj1, obj2) {
    return (obj1.center.x - obj1.size.x/2 <= obj2.center.x + obj2.size.x/2 &&
        obj1.center.x + obj1.size.x/2 >= obj2.center.x - obj2.size.x/2 &&
        obj1.center.y - obj1.size.y/2 <= obj2.center.y + obj2.size.y/2 &&
        obj1.center.y + obj1.size.y/2 >= obj2.center.y - obj2.size.y/2)
  };

  var score = 0;

  window.onload = function() {
     $('#main').show();
  };

  $('.play').click(function() {
    $('#main').hide();
    $('#screen').show();
    new Game("screen");
  });

  $('.reset').click(function() {
    new Game("screen");
    score = 0;
    $('#game-over').hide();
  })

})();
