
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time.
var sphereRotation = [0,0,0];
var spherePosition = [-4,0,0];

var cubeRotation = [0,0,0];
var cubePosition = [-1,0,0];

var cylinderRotation = [0,0,0];
var cylinderPosition = [1.1,0,0];

var coneRotation = [0,0,0];
var conePosition = [3,0,0];

// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.5, 0.5, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
		
		controller = new CameraController(canvas);
		controller.onchange = function(xRot,yRot) {
			RX = xRot;
			RY = yRot;
			window.requestAnimFrame(render); };
    };

    render(0);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}


function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3(0,0,10);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    
    
    // set all the matrices
    setAllMatrices();
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is the new position equals the current position + the rate of of change of that position (often a velocity or speed), times the change in time
		// We can do this with angles or positions, the whole x,y,z position or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
	}
    // draw ground
	gPush();
		var groundPosition = [-5,-5,0];
		gTranslate(groundPosition[0],groundPosition[1],groundPosition[2]);
		gPush();
		{
			gScale(11,1,1);
			setColor(vec4(0.0,0.0,0.0,0.0));
			drawCube();
		}
		gPop();
	gPop();
	
	// draw rock
	gPush();
		// Put the sphere where it should be!
		var rockPosition1 = [-0.5,-3.4,0];
		gTranslate(rockPosition1[0],rockPosition1[1],rockPosition1[2]);	
		gPush();
		{
			// Draw the sphere!
			setColor(vec4(0.16,0.16,0.16,0.0));
			gScale(0.6,0.6,0.6);
			drawSphere();
			gTranslate(-1.5,-0.5,0);
			gScale(0.5,0.5,0.5);
			drawSphere();
		}
		gPop();
	gPop();

	// draw seaweed
	gPush();
		// Put the sphere where it should be!
		var seaweedPosition = [-1,-3,-1];
		gTranslate(seaweedPosition[0],seaweedPosition[1],seaweedPosition[2]);	
		gPush();
		{
			// Draw the sphere!
			setColor(vec4(0.0,1.0,0.0,0.0));
			gScale(0.11,0.35,1);
			se=Math.cos(radians(timestamp/20));
			gRotate(se*30,0,0,1);
			drawSphere();
			gTranslate(0,1.8,0);
			gPush();
			{	
				gTranslate(0,0.2, 0);
				gRotate(se*18, 0, 0, 1);
				gScale(0.9,1.1,1);
				gPush();
				{
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				gPush();
				gScale(0.9,1.2,1);
				{
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				gPush();
				gScale(0.9,1.2,1);
				{				
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(-se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{	
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(-se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(-se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					drawSphere();
				}
				gPop();
				
			}
			gPop();
			
		}
		gPop();
	gPop();

	// draw seaweed2
	gPush();
		// Put the sphere where it should be!
		var seaweedPosition = [0,-3,0.5];
		gTranslate(seaweedPosition[0],seaweedPosition[1],seaweedPosition[2]);	
		gPush();
		{
			// Draw the sphere!
			setColor(vec4(0.0,1.0,0.0,0.0));
			gScale(0.11,0.35,1);
			se=Math.cos(radians(timestamp/20));
			gRotate(se*30,0,0,1);
			drawSphere();
			gTranslate(0,1.8,0);
			gPush();
			{	
				gTranslate(0,0.2, 0);
				gRotate(se*18, 0, 0, 1);
				gScale(0.9,1.1,1);
				gPush();
				{
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				gPush();
				gScale(0.9,1.2,1);
				{
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(-se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(-se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(-se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				
				gPush();
				gScale(0.9,1.2,1);
				{
					drawSphere();
				}
				gPop();
				
			}
			gPop();
		}
		gPop();
	gPop();

	// draw seaweed3
	gPush();
		// Put the sphere where it should be!
		var seaweedPosition = [-0.5,-2.5,0.2];
		gTranslate(seaweedPosition[0],seaweedPosition[1],seaweedPosition[2]);	
		gPush();
		{
			// Draw the sphere!
			setColor(vec4(0.0,1.0,0.0,0.0));
			gScale(0.11,0.35,1);
			se=Math.cos(radians(timestamp/20));
			gRotate(se*30,0,0,1);
			drawSphere();
			gTranslate(0,1.8,0);
			gPush();
			{	
				gTranslate(0,0.2, 0);
				gRotate(se*18, 0, 0, 1);
				gScale(0.9,1.1,1);
				gPush();
				{
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				gPush();
				gScale(0.9,1.2,1);
				{
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(-se*18, 0, 0, 1);				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(-se*18, 0, 0, 1);				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(-se*18, 0, 0, 1);
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);				
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);			
				gPush();
				gScale(0.9,1.2,1);
				{
					
					drawSphere();
				}
				gPop();
				gTranslate(0,2, 0);
				gRotate(se*18, 0, 0, 1);	
				gPush();
				gScale(0.9,1.2,1);
				{
					drawSphere();
				}
				gPop();	
			}
			gPop();
		}
		gPop();
	gPop();

	// draw fish
	gPush();
		// Put the sphere where it should be!
		var headPosition = [0,-2,0];
		gTranslate(headPosition[0],headPosition[1],headPosition[2]);	
		gPush();
		{
			// Draw the sphere!
			setColor(vec4(0.28,0.28,0.31,0.0));
			gScale(0.6,0.6,1.2);
			gRotate(45,0,1,0);
			ud=Math.cos(radians(timestamp / 10));
			coneRotation[1] = coneRotation[1] + 60*dt;
			gRotate(coneRotation[1],0,1,0);
			gTranslate(-3,ud,0);
			drawCone();
			
			//draw body
			gScale(1,1,4);
			gRotate(180,0,1,0);
			gTranslate(0,0,0.615);
			setColor(vec4(1,0.0,0.0,0.0));
			drawCone(); 

			// draw eye
			gTranslate(-0.65,0.5,-0.6);
			gScale(0.3,0.3,0.08);
			setColor(vec4(1.0,1.0,1.0,0.0));
			drawSphere();
			gTranslate(5,0,0);
			setColor(vec4(1.0,1.0,1.0,0.0));
			drawSphere();

			gTranslate(-5,0,-0.6);
			gScale(0.5,0.5,0.5);
			setColor(vec4(0.0,0.0,0.0,0.0));
			drawSphere();
			gTranslate(10,0,0);
			setColor(vec4(0.0,0.0,0.0,0.0));
			drawSphere();

			// draw tail		
			gPush();
			{
				// gTranslate(bodyPosition[0],bodyPosition[1],bodyPosition[2]);
				rl=Math.sin(radians(timestamp*2));
				gRotate(-60,1,0,0);
				gScale(2,2,8);
				gTranslate(-3,-12,1.8);
				setColor(vec4(1,0.0,0.0,0.0));
				
				
				// coneRotation[0] = rl*50;
				// gRotate(coneRotation[0],0,0,1);
				gTranslate(rl,0,0);
				
				drawCone();
				gRotate(100,1,0,0);
				// gRotate(60,1,0,0);
				gScale(0.8,0.3,3.5);
				setColor(vec4(1,0.0,0.0,0.0));
				gTranslate(0,-2,0.5);
				drawCone();
			}
			gPop();		
		}
		gPop();
	gPop();


	// draw people
	gPush();
		// Put the sphere where it should be!
		var headPosition = [3.6,3,0];
		gTranslate(headPosition[0],headPosition[1],headPosition[2]);	
		gPush();
		{
			setColor(vec4(0.25,0.1,0.25,0.5));
			gScale(0.35,0.35,0.35);
			
			// 
			a = Math.cos(radians(timestamp/5));
			gTranslate(a,a,0)
			gRotate(-30,0,1,0);
			drawSphere();
			gTranslate(0,-4,0);
			gScale(2,3,0.5);
			drawCube();
			gPush();
			{
			// // DRAW LEFT LEG
				gTranslate(-0.5,-1.45,0);
				gScale(0.2,0.5,0.7);
				gRotate(a*30,1,0,0);	
				drawCube();
				gTranslate(0,-1,-0.5);
				gRotate(45,1,0,0);
				b = Math.cos(radians(timestamp/8));
				gRotate(b*30,1,0,0);
				drawCube();
				gTranslate(0,-1.05,0.73);
				gScale(1,0.3,1.5);
				drawCube();
			}
			gPop();
			// DRAW RIGHT LEG
			gPush();
			{
				gTranslate(0.5,-1.45,0);
				gScale(0.2,0.5,0.7);
				gRotate(-b*28,1,0,0);	
				drawCube();
				gTranslate(0,-1,-0.5);
				gRotate(45,1,0,0);
				gRotate(-b*28,1,0,0);
				drawCube();
				gTranslate(0,-1.05,0.73);
				gScale(1,0.3,1.5);
				drawCube();
			}
			gPop();
		}

		gPop();
	gPop();
	// draw pao pao 
	gPush();
		// Put the sphere where it should be!
		var headPosition = [3.6,3,3];
		gTranslate(headPosition[0],headPosition[1],headPosition[2]);	
		gPush();
		{
			setColor(vec4(1,1,1,0));
			gScale(0.1,0.1,0.1);
			headPosition[1]=timestamp*0.0088;
			gTranslate(-8,headPosition[1],0);					
			drawSphere();
			gTranslate(-2.5,timestamp*0.0077,0);
			drawSphere();
			gTranslate(-2.5,timestamp*0.0066,0);
			drawSphere();				
		}
		gPop();
	gPop();
	// 





    if( animFlag )
        window.requestAnimFrame(render);
}

// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
//   var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
function CameraController(element) {
	var controller = this;
	this.onchange = null;
	this.xRot = 0;
	this.yRot = 0;
	this.scaleFactor = 3.0;
	this.dragging = false;
	this.curX = 0;
	this.curY = 0;
	
	// Assign a mouse down handler to the HTML element.
	element.onmousedown = function(ev) {
		controller.dragging = true;
		controller.curX = ev.clientX;
		controller.curY = ev.clientY;
	};
	
	// Assign a mouse up handler to the HTML element.
	element.onmouseup = function(ev) {
		controller.dragging = false;
	};
	
	// Assign a mouse move handler to the HTML element.
	element.onmousemove = function(ev) {
		if (controller.dragging) {
			// Determine how far we have moved since the last mouse move
			// event.
			var curX = ev.clientX;
			var curY = ev.clientY;
			var deltaX = (controller.curX - curX) / controller.scaleFactor;
			var deltaY = (controller.curY - curY) / controller.scaleFactor;
			controller.curX = curX;
			controller.curY = curY;
			// Update the X and Y rotation angles based on the mouse motion.
			controller.yRot = (controller.yRot + deltaX) % 360;
			controller.xRot = (controller.xRot + deltaY);
			// Clamp the X rotation to prevent the camera from going upside
			// down.
			if (controller.xRot < -90) {
				controller.xRot = -90;
			} else if (controller.xRot > 90) {
				controller.xRot = 90;
			}
			// Send the onchange event to any listener.
			if (controller.onchange != null) {
				controller.onchange(controller.xRot, controller.yRot);
			}
		}
	};
}
