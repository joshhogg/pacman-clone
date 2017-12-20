/* global requestAnimationFrame */

(function() {
    var Game = function(canvasId) {
        var canvas = document.getElementById(canvasId);
        var ctx = canvas.getContext('2d');
		
		this.lives = 3;
		
		var self = this;
		
		this.reset = function() {
			self.pacman = new Pacman(ctx, gameSize, self.world, self.lives);
			self.ghosts = createGhosts(ctx, this.world);
		};
		
		this.grid = new Grid();
		this.world = createWorld(ctx, this.grid);	
		this.reset();

		canvas.width = this.grid.width * 20;
		canvas.height= this.grid.height * 20;
		var gameSize = {x: canvas.width, y: canvas.height};
		
        var fps = 60;
        var tick = function() {
            self.update(ctx);
			if (self.pacman.lives >= 0) {
				self.draw(ctx, gameSize);
					setTimeout(function () {
						requestAnimationFrame(tick);
					}, 1000 / fps);
			};
                
        };
        tick();
    };
    
    Game.prototype = {
        update: function(game) {
			if (!this.pacman.alive) {
				this.reset()
			};
            this.pacman.update(game, this.pacman, this.world);
			for (var i = 0; i < this.ghosts.length; i++) {
				this.ghosts[i].update(game, this.ghosts[i], this.world, this);
			};
            updateScore(score);
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
        }
    };

    var Pacman = function(game, gameSize, world, lives) {
            this.game = game;
            this.size = {x: 18, y: 18};
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
				pacman.velocity.x = 0;
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
	
	var Ghost = function(game, world, center, color, id) {
		this.game = game;
		this.size = {x:18, y:18};
		this.center = center;
		this.world = world;
		this.color = color;
		this.ghostID = id;
		
		this.direction = 'up';
		/*this.chooseDirection = function(target) {
			var difference = {x: target.x - this.x, y: target.y - this.y};
			
			}
			/*if (this.direction.x == 0 && this.direction.y == 0) {
				var randomIndex = function() {
					return Math.floor(Math.random()*2);
				};
				var xory = ['x', 'y'];
				var direction = [-2, 2];
				
				this.direction[xory[randomIndex()]] += direction[randomIndex()];
			};
		};*/
		targets = [{center:{x:2*20 , y:0*20 }},
				  {center:{x:0*20 , y:33*20 }},
				  {center:{x:25*20 , y:0*20 }},
				  {center:{x:27*20 , y:33*20 }}];
		this.canMove = true;
		this.target = null;
		this.targetCell = targets[id];
		
		
		this.reachedTarget = function () {

			var coordinates = getCoordinates(this);
			
			/* targets x and y will always be the top left corner */
			var targetCoordinates = {topLeftCorner: {x: this.target.x*20, y: this.target.y*20},
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
	
			if (!ghost.target)
				if (GAME.grid.gridState[Math.floor(ghost.center.y/20)][Math.floor(ghost.center.x/20)] == GAME.grid.gridKeys['JAIL']) {
					pathfinder(ghost, {center: {x: 14*20, y:13*20}}, GAME.grid);
				}
				else {
					pathfinder(ghost, ghost.targetCell, GAME.grid);
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
			/*if (ghost.direction.x == 2) {
				var arrow = 'right';
				checkCollision(game, arrow, ghost, world);
				if (ghost.canMove)
					ghost.center.x += 2;
				else
					ghost.direction = {x:0, y:0};
			} else if (ghost.direction.x == -2) {
				var arrow = 'left';
				checkCollision(game, arrow, ghost, world);
				if (ghost.canMove)
					ghost.center.x -= 2;
				else
					ghost.direction = {x:0, y:0};				
			} else if (ghost.direction.y == 2) {
				var arrow = 'down';
				checkCollision(game, arrow, ghost, world);
				if (ghost.canMove)
					ghost.center.y += 2;
				else
					ghost.direction = {x:0, y:0};				
			} else if (ghost.direction.y == -2) {
				var arrow = 'up';
				checkCollision(game, arrow, ghost, world);
				if (ghost.canMove)
					ghost.center.y -= 2;
				else
					ghost.direction = {x:0, y:0};				
			};*/
			
			
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
		this.size = {x:15, y:15};
		this.center = center;
		
    };
    
    Wall.prototype = {
        draw: function(game) {
            drawGameObj(this.game, this, "blue");
        }
    };
	
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
					  /**/[1,9,9,9,9,9,0,9,9,9,1,8,8,8,8,8,8,1,9,9,9,0,9,9,9,9,9,1],/**/
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
						 down: grid.gridState[directions.down.y][directions.down.x],
		};

		var currentDirection = vehicle.direction;
		
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
			
			return Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
		};
			
		for (var direction in directions) {
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
	
	var findPacmanGrid = function(pacman) {
		return {x: Math.floor(pacman.center.x/20),
				y: Math.floor(pacman.center.y/20)}
	};
	
	var isTouching = function(obj1, obj2) {
		return (obj1.center.x - obj1.size.x/2 <= obj2.center.x + obj2.size.x/2 &&
				obj1.center.x + obj1.size.x/2 >= obj2.center.x - obj2.size.x/2 &&
				obj1.center.y - obj1.size.y/2 <= obj2.center.y + obj2.size.y/2 &&
				obj1.center.y + obj1.size.y/2 >= obj2.center.y - obj2.size.y/2)
	};
	
	var score = 0;
	
    window.onload = function() {
		new Game("screen");
};
})();