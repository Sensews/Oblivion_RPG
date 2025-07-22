class DiceBackground {
    constructor() {
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.canvas = null;
        this.minSpawnInterval = 800;
        this.maxSpawnInterval = 3000; 
        this.isInitialized = false;
        this.isRunning = false;
        this.dices = [];
        this.maxDices = 25;
    }

    async init() {
        try {
            console.log('🎲 Iniciando sistema de dados 3D...');
            
            this.createCanvas();
            this.setupEngine();
            this.setupScene();
            this.setupCamera();
            this.setupLighting();
            await this.setupPhysics();
            this.setupEnvironment();
            this.startRenderLoop();
            this.startAutomaticDiceSystem();
            
            this.isInitialized = true;
            this.isRunning = true;
            
            console.log('🎲 Sistema de dados 3D inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema 3D:', error);
        }
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'dice-background-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -1;
            pointer-events: none;
            opacity: 0;
            transition: opacity 2s ease-in-out;
        `;
        
        document.body.insertBefore(this.canvas, document.body.firstChild);
    }

    setupEngine() {
        this.engine = new BABYLON.Engine(this.canvas, true, {
            adaptToDeviceRatio: true,
            antialias: true
        });
        
        this.engine.setHardwareScalingLevel(0.8);
    }

    setupScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
        this.scene.skipPointerMovePicking = true;
        this.scene.autoClear = true;
        this.scene.autoClearDepthAndStencil = true;
    }

    setupCamera() {
        this.camera = new BABYLON.ArcRotateCamera(
            "camera",
            Math.PI / 4,
            Math.PI / 3,
            20,
            BABYLON.Vector3.Zero(),
            this.scene
        );
        
        this.camera.useAutoRotationBehavior = true;
        this.camera.autoRotationBehavior.idleRotationSpeed = 0.1;
        this.camera.setTarget(BABYLON.Vector3.Zero());
    }

    setupLighting() {
        // Luz ambiente
        const ambientLight = new BABYLON.HemisphericLight(
            "ambientLight",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambientLight.intensity = 0.4;
        ambientLight.diffuse = new BABYLON.Color3(0.7, 0.8, 1.0);

        // Luz direcional
        const directionalLight = new BABYLON.DirectionalLight(
            "directionalLight",
            new BABYLON.Vector3(-1, -1, -1),
            this.scene
        );
        directionalLight.intensity = 0.8;
        directionalLight.diffuse = new BABYLON.Color3(1.0, 0.9, 0.8);

        // Luz colorida
        const spotLight = new BABYLON.SpotLight(
            "spotLight",
            new BABYLON.Vector3(5, 10, 5),
            new BABYLON.Vector3(-1, -1, -1),
            Math.PI / 4,
            2,
            this.scene
        );
        spotLight.intensity = 0.6;
        spotLight.diffuse = new BABYLON.Color3(0.5, 0.3, 1.0);
    }

    async setupPhysics() {
        this.scene.enablePhysics(new BABYLON.Vector3(0, -15, 0), new BABYLON.AmmoJSPlugin());
    }

    setupEnvironment() {
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 50,
            height: 50
        }, this.scene);
        
        ground.position.y = -10;
        ground.visibility = 0;
        ground.physicsImpostor = new BABYLON.PhysicsImpostor(
            ground,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.4, friction: 0.8 },
            this.scene
        );

        this.createInvisibleWalls();
        
        setTimeout(() => {
            this.canvas.style.opacity = '0.4';
        }, 1000);
    }

    createInvisibleWalls() {
        const wallSize = 25;
        const wallHeight = 20;
        const wallPositions = [
            { x: wallSize, y: 0, z: 0 },
            { x: -wallSize, y: 0, z: 0 },
            { x: 0, y: 0, z: wallSize },
            { x: 0, y: 0, z: -wallSize }
        ];

        wallPositions.forEach((pos, index) => {
            const wall = BABYLON.MeshBuilder.CreateBox(`wall${index}`, {
                width: index < 2 ? 1 : wallSize * 2,
                height: wallHeight,
                depth: index < 2 ? wallSize * 2 : 1
            }, this.scene);
            
            wall.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);
            wall.visibility = 0;
            wall.physicsImpostor = new BABYLON.PhysicsImpostor(
                wall,
                BABYLON.PhysicsImpostor.BoxImpostor,
                { mass: 0, restitution: 0.3 },
                this.scene
            );
        });
    }

    startRenderLoop() {
        this.engine.runRenderLoop(() => {
            if (this.scene && this.isRunning) {
                this.scene.render();
                this.cleanupOldDices();
            }
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }

    startAutomaticDiceSystem() {
        setTimeout(() => {
            this.spawnDicesWave();
        }, 300);
        
        setTimeout(() => {
            this.spawnDicesWave();
        }, 1500);

        this.scheduleNextDiceSpawn();

        setInterval(() => {
            if (Math.random() < 0.4) { 
                this.spawnDicesWave();
            }
        }, 8000 + Math.random() * 7000); 
    }

    scheduleNextDiceSpawn() {
        const randomInterval = this.minSpawnInterval + 
            Math.random() * (this.maxSpawnInterval - this.minSpawnInterval);
        
        setTimeout(() => {
            if (this.dices.length < this.maxDices) {
                this.spawnRandomDice();
            }
            this.scheduleNextDiceSpawn();
        }, randomInterval);
    }

    spawnRandomDice() {
        const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
        const diceType = diceTypes[Math.floor(Math.random() * diceTypes.length)];
        
        // Área de spawn mais ampla
        const position = new BABYLON.Vector3(
            (Math.random() - 0.5) * 30,
            15 + Math.random() * 10,
            (Math.random() - 0.5) * 30 
        );

        this.createDice(diceType, position);
    }

    spawnDicesWave() {
        const waveSize = 4 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < waveSize; i++) {
            setTimeout(() => {
                if (this.dices.length < this.maxDices) {
                    this.spawnRandomDice();
                }
            }, i * (50 + Math.random() * 150));
        }
    }

    createDice(type, position) {
        let dice;
        let material;

        // Criar material com cores variadas
        material = new BABYLON.StandardMaterial(`diceMaterial_${Date.now()}`, this.scene);
        
        const colors = [
            new BABYLON.Color3(0.8, 0.2, 0.9), // Roxo
            new BABYLON.Color3(0.2, 0.8, 0.9), // Ciano
            new BABYLON.Color3(0.9, 0.4, 0.2), // Laranja
            new BABYLON.Color3(0.3, 0.9, 0.3), // Verde
            new BABYLON.Color3(0.9, 0.2, 0.3), // Vermelho
            new BABYLON.Color3(0.9, 0.9, 0.2)  // Amarelo
        ];
        
        material.diffuseColor = colors[Math.floor(Math.random() * colors.length)];
        material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        material.emissiveColor = material.diffuseColor.scale(0.1);

        switch(type) {
            case 'd4':
                dice = BABYLON.MeshBuilder.CreatePolyhedron("d4", {
                    type: 0,
                    size: 0.8
                }, this.scene);
                break;
            case 'd6':
                dice = BABYLON.MeshBuilder.CreateBox("d6", {
                    size: 1.5
                }, this.scene);
                break;
            case 'd8':
                dice = BABYLON.MeshBuilder.CreatePolyhedron("d8", {
                    type: 1,
                    size: 1.2
                }, this.scene);
                break;
            case 'd10':
                dice = BABYLON.MeshBuilder.CreatePolyhedron("d10", {
                    type: 2,
                    size: 1.3
                }, this.scene);
                break;
            case 'd12':
                dice = BABYLON.MeshBuilder.CreatePolyhedron("d12", {
                    type: 3,
                    size: 1.4
                }, this.scene);
                break;
            case 'd20':
                dice = BABYLON.MeshBuilder.CreatePolyhedron("d20", {
                    type: 4,
                    size: 1.5
                }, this.scene);
                break;
            default:
                dice = BABYLON.MeshBuilder.CreateBox("d6", {
                    size: 1.5
                }, this.scene);
        }

        dice.material = material;
        dice.position = position;

        // Adicionar física
        dice.physicsImpostor = new BABYLON.PhysicsImpostor(
            dice,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { 
                mass: 1,
                restitution: 0.6,
                friction: 0.8
            },
            this.scene
        );

        // Aplicar impulso inicial aleatório
        const impulse = new BABYLON.Vector3(
            (Math.random() - 0.5) * 8,
            -3 - Math.random() * 2,
            (Math.random() - 0.5) * 8
        );
        
        const angularVelocity = new BABYLON.Vector3(
            Math.random() * 15 - 7.5,
            Math.random() * 15 - 7.5,
            Math.random() * 15 - 7.5
        );

        dice.physicsImpostor.setLinearVelocity(impulse);
        dice.physicsImpostor.setAngularVelocity(angularVelocity);

        dice.spawnTime = Date.now();
        this.dices.push(dice);
    }

    cleanupOldDices() {
        const currentTime = Date.now();
        const maxLifetime = 30000;

        this.dices = this.dices.filter(dice => {
            if (currentTime - dice.spawnTime > maxLifetime || dice.position.y < -15) {
                dice.dispose();
                return false;
            }
            return true;
        });

        if (this.dices.length > 20) {
            console.log(`🎲 ${this.dices.length} dados ativos`);
        }
    }

    toggle() {
        this.isRunning = !this.isRunning;
        this.canvas.style.opacity = this.isRunning ? '0.4' : '0.1';
    }

    destroy() {
        this.isRunning = false;
        
        if (this.dices) {
            this.dices.forEach(dice => dice.dispose());
            this.dices = [];
        }
        
        if (this.scene) {
            this.scene.dispose();
        }
        
        if (this.engine) {
            this.engine.dispose();
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        this.isInitialized = false;
    }
}

window.DiceBackground = DiceBackground;
