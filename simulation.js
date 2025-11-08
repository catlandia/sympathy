// ==================== SIMULATION ENGINE ====================

class Simulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 800;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.cells = [];
        this.organisms = [];
        this.plants = [];
        this.trees = [];
        this.particles = [];

        this.isPaused = false;
        this.time = 0;
        this.fps = 0;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();

        this.simulationSpeed = 1.0;
        this.combinationChance = 0.1; // 10% chance
        this.showEnergy = true;
        this.showTrails = false;
        this.selectedEntity = null;

        // Light sources for photosynthetic cells
        this.lightSources = [
            { x: this.width / 2, y: 50, intensity: 100 }
        ];

        this.init();
    }

    init() {
        // Add initial entities
        this.addWanderingCells(5);
        this.addPhotoCells(3);
        this.addPredatorCells(2);
        this.addPlants(3);
        this.addTrees(2);
    }

    addWanderingCells(count) {
        for (let i = 0; i < count; i++) {
            this.cells.push(new WanderingCell(
                Math.random() * this.width,
                Math.random() * this.height
            ));
        }
    }

    addPhotoCells(count) {
        for (let i = 0; i < count; i++) {
            this.cells.push(new PhotosyntheticCell(
                Math.random() * this.width,
                Math.random() * this.height
            ));
        }
    }

    addPredatorCells(count) {
        for (let i = 0; i < count; i++) {
            this.cells.push(new PredatorCell(
                Math.random() * this.width,
                Math.random() * this.height
            ));
        }
    }

    addPlants(count) {
        for (let i = 0; i < count; i++) {
            this.plants.push(new Plant(
                Math.random() * this.width,
                this.height - 50
            ));
        }
    }

    addTrees(count) {
        for (let i = 0; i < count; i++) {
            this.trees.push(new Tree(
                Math.random() * this.width,
                this.height - 50
            ));
        }
    }

    update(deltaTime) {
        if (this.isPaused) return;

        const dt = deltaTime * this.simulationSpeed;
        this.time += dt;

        // Update all cells
        for (let i = this.cells.length - 1; i >= 0; i--) {
            const cell = this.cells[i];
            cell.update(dt, this);

            // Remove dead cells
            if (cell.energy <= 0) {
                this.cells.splice(i, 1);
                continue;
            }

            // Handle reproduction
            if (cell.shouldReproduce()) {
                const offspring = cell.reproduce();
                if (offspring) {
                    this.cells.push(offspring);
                }
            }

            // Keep cells in bounds
            cell.x = Math.max(cell.radius, Math.min(this.width - cell.radius, cell.x));
            cell.y = Math.max(cell.radius, Math.min(this.height - cell.radius, cell.y));
        }

        // Handle cell collisions and combinations
        this.handleCollisions();

        // Update organisms
        for (let i = this.organisms.length - 1; i >= 0; i--) {
            const organism = this.organisms[i];
            organism.update(dt, this);

            // Remove dead organisms (no energy or no cells left)
            if (organism.energy <= 0 || organism.cells.length === 0) {
                this.organisms.splice(i, 1);
                continue;
            }

            // Handle reproduction
            if (organism.shouldReproduce()) {
                const offspring = organism.reproduce();
                if (offspring) {
                    this.organisms.push(offspring);
                }
            }

            // Keep organisms in bounds
            organism.x = Math.max(organism.radius, Math.min(this.width - organism.radius, organism.x));
            organism.y = Math.max(organism.radius, Math.min(this.height - organism.radius, organism.y));
        }

        // Update plants
        for (let i = this.plants.length - 1; i >= 0; i--) {
            const plant = this.plants[i];
            plant.update(dt, this);

            if (plant.isDead()) {
                this.plants.splice(i, 1);
            }
        }

        // Update trees
        for (let i = this.trees.length - 1; i >= 0; i--) {
            const tree = this.trees[i];
            tree.update(dt, this);

            if (tree.isDead()) {
                this.trees.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    handleCollisions() {
        const cellsToRemove = new Set();

        for (let i = 0; i < this.cells.length; i++) {
            if (cellsToRemove.has(i)) continue;

            for (let j = i + 1; j < this.cells.length; j++) {
                if (cellsToRemove.has(j)) continue;

                const cellA = this.cells[i];
                const cellB = this.cells[j];

                const dx = cellB.x - cellA.x;
                const dy = cellB.y - cellA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDist = cellA.radius + cellB.radius;

                if (distance < minDist) {
                    // Check if cells can combine (same type, not predator eating prey)
                    if (cellA.type === cellB.type &&
                        cellA.type !== 'predator' &&
                        !cellA.isOrganism &&
                        !cellB.isOrganism &&
                        Math.random() < this.combinationChance) {

                        // Combine cells into organism
                        const organism = new Organism(cellA, cellB);

                        this.organisms.push(organism);

                        // Mark cells for removal from free cells array
                        cellsToRemove.add(i);
                        cellsToRemove.add(j);

                        // Create combination particles
                        for (let k = 0; k < 10; k++) {
                            this.addParticle(organism.x, organism.y, cellA.color);
                        }

                        break;
                    } else {
                        // Normal collision
                        cellA.handleCollision(cellB, this);
                    }
                }
            }
        }

        // Remove combined cells
        for (let i = this.cells.length - 1; i >= 0; i--) {
            if (cellsToRemove.has(i)) {
                this.cells.splice(i, 1);
            }
        }

        // Check for cells colliding with organisms (to attach)
        for (let i = this.cells.length - 1; i >= 0; i--) {
            const cell = this.cells[i];
            if (cell.isOrganism) continue; // Skip cells already in organisms

            for (let j = 0; j < this.organisms.length; j++) {
                const organism = this.organisms[j];

                // Check if same type
                if (cell.type !== organism.cellType) continue;
                if (cell.type === 'predator') continue; // Predators don't combine

                // Check if cell is close to any cell in the organism
                let canAttach = false;
                for (let k = 0; k < organism.cells.length; k++) {
                    const orgCell = organism.cells[k];
                    const dx = cell.x - orgCell.x;
                    const dy = cell.y - orgCell.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < cell.radius + orgCell.radius) {
                        canAttach = true;
                        break;
                    }
                }

                if (canAttach && Math.random() < this.combinationChance) {
                    // Add cell to organism
                    organism.addCell(cell);
                    this.cells.splice(i, 1);

                    // Create particles
                    for (let k = 0; k < 5; k++) {
                        this.addParticle(cell.x, cell.y, cell.color);
                    }

                    break;
                }
            }
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#f9f9f9';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw gradient background (ground/sky)
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#e3f2fd');
        gradient.addColorStop(0.7, '#fff9c4');
        gradient.addColorStop(1, '#d7ccc8');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw ground
        this.ctx.fillStyle = '#8d6e63';
        this.ctx.fillRect(0, this.height - 60, this.width, 60);

        // Draw light sources
        this.lightSources.forEach(light => {
            const lightGradient = this.ctx.createRadialGradient(
                light.x, light.y, 0, light.x, light.y, light.intensity
            );
            lightGradient.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
            lightGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
            this.ctx.fillStyle = lightGradient;
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Draw sun
            this.ctx.fillStyle = '#fff176';
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw trees
        this.trees.forEach(tree => tree.render(this.ctx));

        // Draw plants
        this.plants.forEach(plant => plant.render(this.ctx));

        // Draw cells
        this.cells.forEach(cell => cell.render(this.ctx, this.showEnergy));

        // Draw organisms
        this.organisms.forEach(organism => organism.render(this.ctx, this.showEnergy));

        // Draw particles
        this.particles.forEach(particle => particle.render(this.ctx));

        // Update FPS
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
    }

    addParticle(x, y, color) {
        this.particles.push(new Particle(x, y, color));
    }

    reset() {
        this.cells = [];
        this.organisms = [];
        this.plants = [];
        this.trees = [];
        this.particles = [];
        this.time = 0;
        this.init();
    }

    clear() {
        this.cells = [];
        this.organisms = [];
        this.plants = [];
        this.trees = [];
        this.particles = [];
    }
}

// ==================== CELL BASE CLASS ====================

class Cell {
    constructor(x, y, type, color) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
        this.radius = 8;
        this.energy = 100;
        this.maxEnergy = 100;
        this.speed = 1;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.reproductionCooldown = 0;
        this.isOrganism = false;
    }

    update(dt, sim) {
        this.age += dt;
        this.energy -= 0.05 * dt;
        this.reproductionCooldown = Math.max(0, this.reproductionCooldown - dt);

        // Apply velocity
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Add some friction
        this.vx *= 0.98;
        this.vy *= 0.98;
    }

    render(ctx, showEnergy) {
        // Draw cell body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw outline
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw nucleus
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Draw energy bar
        if (showEnergy) {
            const barWidth = this.radius * 2;
            const barHeight = 3;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.radius - 8;

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const energyPercent = this.energy / this.maxEnergy;
            const energyColor = energyPercent > 0.5 ? '#4CAF50' :
                                energyPercent > 0.25 ? '#FFC107' : '#F44336';

            ctx.fillStyle = energyColor;
            ctx.fillRect(barX, barY, barWidth * energyPercent, barHeight);
        }
    }

    shouldReproduce() {
        return this.energy > this.maxEnergy * 0.8 &&
               this.age > 5 &&
               this.reproductionCooldown <= 0;
    }

    reproduce() {
        this.energy -= this.maxEnergy * 0.4;
        this.reproductionCooldown = 10;
        return null; // Override in subclasses
    }

    handleCollision(otherCell, sim) {
        // Basic elastic collision
        const dx = otherCell.x - this.x;
        const dy = otherCell.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const nx = dx / distance;
            const ny = dy / distance;
            const pushForce = 2;

            this.vx -= nx * pushForce;
            this.vy -= ny * pushForce;
            otherCell.vx += nx * pushForce;
            otherCell.vy += ny * pushForce;
        }
    }
}

// ==================== WANDERING CELL ====================

class WanderingCell extends Cell {
    constructor(x, y) {
        super(x, y, 'wandering', '#4CAF50');
        this.changeDirectionTimer = 0;
        this.speed = 1.5;
    }

    update(dt, sim) {
        super.update(dt, sim);

        this.changeDirectionTimer -= dt;
        if (this.changeDirectionTimer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
            this.changeDirectionTimer = 2 + Math.random() * 3;
        }

        // Gain a bit of energy from the environment
        this.energy += 0.02 * dt;
        this.energy = Math.min(this.energy, this.maxEnergy);
    }

    reproduce() {
        super.reproduce();
        return new WanderingCell(
            this.x + (Math.random() - 0.5) * 20,
            this.y + (Math.random() - 0.5) * 20
        );
    }
}

// ==================== PHOTOSYNTHETIC CELL ====================

class PhotosyntheticCell extends Cell {
    constructor(x, y) {
        super(x, y, 'photosynthetic', '#2196F3');
        this.speed = 1;
        this.radius = 10;
    }

    update(dt, sim) {
        super.update(dt, sim);

        // Move toward light
        if (sim.lightSources.length > 0) {
            const light = sim.lightSources[0];
            const dx = light.x - this.x;
            const dy = light.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 50) {
                this.vx += (dx / distance) * this.speed * 0.1;
                this.vy += (dy / distance) * this.speed * 0.1;
            }

            // Gain energy from light
            if (distance < light.intensity) {
                const lightEnergy = (1 - distance / light.intensity) * 0.2;
                this.energy += lightEnergy * dt;
                this.energy = Math.min(this.energy, this.maxEnergy);
            }
        }
    }

    reproduce() {
        super.reproduce();
        return new PhotosyntheticCell(
            this.x + (Math.random() - 0.5) * 20,
            this.y + (Math.random() - 0.5) * 20
        );
    }

    render(ctx, showEnergy) {
        super.render(ctx, showEnergy);

        // Draw photosynthetic organelles
        ctx.fillStyle = 'rgba(76, 175, 80, 0.5)';
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const x = this.x + Math.cos(angle) * this.radius * 0.5;
            const y = this.y + Math.sin(angle) * this.radius * 0.5;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ==================== PREDATOR CELL ====================

class PredatorCell extends Cell {
    constructor(x, y) {
        super(x, y, 'predator', '#F44336');
        this.speed = 2;
        this.radius = 12;
        this.huntingRange = 150;
    }

    update(dt, sim) {
        super.update(dt, sim);

        // Hunt for prey
        let closestPrey = null;
        let closestDistance = this.huntingRange;

        sim.cells.forEach(cell => {
            if (cell !== this && cell.type !== 'predator') {
                const dx = cell.x - this.x;
                const dy = cell.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPrey = cell;
                }
            }
        });

        if (closestPrey) {
            const dx = closestPrey.x - this.x;
            const dy = closestPrey.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            this.vx += (dx / distance) * this.speed * 0.15;
            this.vy += (dy / distance) * this.speed * 0.15;
        } else {
            // Wander if no prey
            if (Math.random() < 0.02) {
                const angle = Math.random() * Math.PI * 2;
                this.vx += Math.cos(angle) * this.speed * 0.1;
                this.vy += Math.sin(angle) * this.speed * 0.1;
            }
        }

        // Lose energy faster
        this.energy -= 0.05 * dt;
    }

    handleCollision(otherCell, sim) {
        super.handleCollision(otherCell, sim);

        // Consume other cells
        if (otherCell.type !== 'predator') {
            const energyGain = otherCell.energy * 0.5;
            this.energy += energyGain;
            this.energy = Math.min(this.energy, this.maxEnergy);

            otherCell.energy -= energyGain * 2;

            // Create particles
            for (let i = 0; i < 5; i++) {
                sim.addParticle(otherCell.x, otherCell.y, otherCell.color);
            }
        }
    }

    reproduce() {
        super.reproduce();
        return new PredatorCell(
            this.x + (Math.random() - 0.5) * 20,
            this.y + (Math.random() - 0.5) * 20
        );
    }

    render(ctx, showEnergy) {
        super.render(ctx, showEnergy);

        // Draw teeth/spikes
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(angle) * this.radius,
                this.y + Math.sin(angle) * this.radius
            );
            ctx.stroke();
        }
    }
}

// ==================== PLANT ====================

class Plant {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.height = 5;
        this.maxHeight = 80 + Math.random() * 40;
        this.width = 3;
        this.age = 0;
        this.growthRate = 0.5;
        this.leaves = [];
        this.health = 100;
    }

    update(dt, sim) {
        this.age += dt;

        // Grow
        if (this.height < this.maxHeight) {
            this.height += this.growthRate * dt;
            this.width = 3 + (this.height / this.maxHeight) * 2;
        }

        // Add leaves periodically
        if (Math.random() < 0.01 && this.leaves.length < 10) {
            const leafHeight = 20 + Math.random() * (this.height - 20);
            this.leaves.push({
                y: this.y - leafHeight,
                side: Math.random() < 0.5 ? -1 : 1,
                size: 5 + Math.random() * 5,
                angle: Math.random() * 0.5
            });
        }

        // Sway in the wind
        this.leaves.forEach(leaf => {
            leaf.angle = Math.sin(this.age + leaf.y) * 0.3;
        });
    }

    render(ctx) {
        // Draw stem
        ctx.strokeStyle = '#558b2f';
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y - this.height);
        ctx.stroke();

        // Draw leaves
        this.leaves.forEach(leaf => {
            ctx.save();
            ctx.translate(this.x, leaf.y);
            ctx.rotate(leaf.angle);

            ctx.fillStyle = '#8BC34A';
            ctx.beginPath();
            ctx.ellipse(
                leaf.side * leaf.size, 0,
                leaf.size, leaf.size * 0.6,
                0, 0, Math.PI * 2
            );
            ctx.fill();

            ctx.restore();
        });

        // Draw flower on top
        if (this.height > this.maxHeight * 0.8) {
            const flowerY = this.y - this.height;

            // Petals
            ctx.fillStyle = '#E91E63';
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const petalX = this.x + Math.cos(angle) * 6;
                const petalY = flowerY + Math.sin(angle) * 6;

                ctx.beginPath();
                ctx.arc(petalX, petalY, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Center
            ctx.fillStyle = '#FFC107';
            ctx.beginPath();
            ctx.arc(this.x, flowerY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    isDead() {
        return this.health <= 0;
    }
}

// ==================== TREE ====================

class Tree {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.height = 10;
        this.maxHeight = 150 + Math.random() * 100;
        this.trunkWidth = 8;
        this.age = 0;
        this.growthRate = 0.3;
        this.branches = [];
        this.health = 100;
        this.foliageRadius = 0;
    }

    update(dt, sim) {
        this.age += dt;

        // Grow
        if (this.height < this.maxHeight) {
            this.height += this.growthRate * dt;
            this.trunkWidth = 8 + (this.height / this.maxHeight) * 12;
        }

        // Grow foliage
        const targetFoliage = this.height * 0.4;
        if (this.foliageRadius < targetFoliage) {
            this.foliageRadius += 0.2 * dt;
        }

        // Add branches
        if (Math.random() < 0.005 && this.branches.length < 15 && this.height > 40) {
            const branchHeight = 40 + Math.random() * (this.height - 40);
            this.branches.push({
                y: this.y - branchHeight,
                side: Math.random() < 0.5 ? -1 : 1,
                length: 20 + Math.random() * 30,
                angle: 0.3 + Math.random() * 0.5,
                width: 3 + Math.random() * 3
            });
        }
    }

    render(ctx) {
        // Draw trunk
        ctx.fillStyle = '#795548';
        ctx.beginPath();
        ctx.moveTo(this.x - this.trunkWidth / 2, this.y);
        ctx.lineTo(this.x - this.trunkWidth / 3, this.y - this.height);
        ctx.lineTo(this.x + this.trunkWidth / 3, this.y - this.height);
        ctx.lineTo(this.x + this.trunkWidth / 2, this.y);
        ctx.closePath();
        ctx.fill();

        // Draw trunk texture
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.height; i += 10) {
            ctx.beginPath();
            ctx.moveTo(this.x - this.trunkWidth / 2, this.y - i);
            ctx.lineTo(this.x + this.trunkWidth / 2, this.y - i);
            ctx.stroke();
        }

        // Draw branches
        this.branches.forEach(branch => {
            ctx.strokeStyle = '#6d4c41';
            ctx.lineWidth = branch.width;
            ctx.lineCap = 'round';

            const endX = this.x + branch.side * Math.cos(branch.angle) * branch.length;
            const endY = branch.y - Math.sin(branch.angle) * branch.length;

            ctx.beginPath();
            ctx.moveTo(this.x, branch.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        });

        // Draw foliage (canopy)
        if (this.foliageRadius > 0) {
            const canopyY = this.y - this.height;

            // Multiple layers for depth
            for (let layer = 0; layer < 3; layer++) {
                const layerRadius = this.foliageRadius * (1 - layer * 0.15);
                const layerY = canopyY + layer * 10;

                ctx.fillStyle = layer === 0 ? '#4CAF50' :
                               layer === 1 ? '#66BB6A' : '#81C784';

                // Draw as rough circle with some variation
                ctx.beginPath();
                for (let angle = 0; angle < Math.PI * 2; angle += 0.5) {
                    const variance = (Math.sin(angle * 3 + this.age) * 0.2 + 1);
                    const radius = layerRadius * variance;
                    const px = this.x + Math.cos(angle) * radius;
                    const py = layerY + Math.sin(angle) * radius * 0.8;

                    if (angle === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        ctx.lineTo(px, py);
                    }
                }
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    isDead() {
        return this.health <= 0;
    }
}

// ==================== ORGANISM ====================

class Organism {
    constructor(cellA, cellB) {
        // Array of cells that make up this organism
        this.cells = [cellA, cellB];
        this.cellType = cellA.type;
        this.isOrganism = true;
        this.type = this.cellType;

        // Center position (calculated from cells)
        this.updateCenter();

        // Connections between cells (pairs of indices)
        this.connections = [[0, 1]]; // Connect first two cells

        // Organism properties
        this.age = 0;
        this.reproductionCooldown = 0;
        this.changeDirectionTimer = 0;
        this.huntingRange = 150;

        // Mark cells as part of organism
        this.cells.forEach(cell => {
            cell.isOrganism = true;
            cell.organismParent = this;
        });
    }

    updateCenter() {
        let sumX = 0;
        let sumY = 0;
        this.cells.forEach(cell => {
            sumX += cell.x;
            sumY += cell.y;
        });
        this.x = sumX / this.cells.length;
        this.y = sumY / this.cells.length;
    }

    get cellCount() {
        return this.cells.length;
    }

    get energy() {
        return this.cells.reduce((sum, cell) => sum + cell.energy, 0);
    }

    set energy(value) {
        // Distribute energy equally among cells
        const perCell = value / this.cells.length;
        this.cells.forEach(cell => {
            cell.energy = perCell;
        });
    }

    get radius() {
        // Calculate bounding radius
        let maxDist = 0;
        this.cells.forEach(cell => {
            const dist = Math.sqrt((cell.x - this.x) ** 2 + (cell.y - this.y) ** 2);
            maxDist = Math.max(maxDist, dist + cell.radius);
        });
        return maxDist;
    }

    addCell(newCell) {
        // Find closest cell in organism to attach to
        let closestIdx = 0;
        let closestDist = Infinity;

        this.cells.forEach((cell, idx) => {
            const dist = Math.sqrt((cell.x - newCell.x) ** 2 + (cell.y - newCell.y) ** 2);
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = idx;
            }
        });

        // Add the new cell
        const newIdx = this.cells.length;
        this.cells.push(newCell);
        this.connections.push([closestIdx, newIdx]);

        newCell.isOrganism = true;
        newCell.organismParent = this;

        this.updateCenter();
    }

    update(dt, sim) {
        this.age += dt;
        this.reproductionCooldown = Math.max(0, this.reproductionCooldown - dt);

        // Update individual cells
        this.cells.forEach(cell => {
            // Cells still update their own energy
            cell.energy -= 0.05 * dt;
        });

        // Remove dead cells from organism
        this.cells = this.cells.filter(cell => cell.energy > 0);
        if (this.cells.length === 0) {
            return; // Organism is dead
        }

        // Apply spring forces to keep cells connected
        this.applyConnectionForces(dt);

        // Behavior based on cell type (applies forces to all cells)
        if (this.cellType === 'wandering') {
            this.updateWandering(dt);
        } else if (this.cellType === 'photosynthetic') {
            this.updatePhotosynthetic(dt, sim);
        } else if (this.cellType === 'predator') {
            this.updatePredator(dt, sim);
        }

        // Update cell positions based on their velocities
        this.cells.forEach(cell => {
            cell.x += cell.vx * dt;
            cell.y += cell.vy * dt;

            // Keep cells in bounds
            cell.x = Math.max(cell.radius, Math.min(sim.width - cell.radius, cell.x));
            cell.y = Math.max(cell.radius, Math.min(sim.height - cell.radius, cell.y));
        });

        // Update center position
        this.updateCenter();
    }

    applyConnectionForces(dt) {
        const springStrength = 0.5;
        const targetDistance = 16; // Cells should be about this far apart (2 radii)
        const damping = 0.9;

        // Apply spring forces between connected cells
        this.connections.forEach(([idxA, idxB]) => {
            const cellA = this.cells[idxA];
            const cellB = this.cells[idxB];

            if (!cellA || !cellB) return;

            const dx = cellB.x - cellA.x;
            const dy = cellB.y - cellA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const force = (distance - targetDistance) * springStrength;
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                cellA.vx += fx * dt;
                cellA.vy += fy * dt;
                cellB.vx -= fx * dt;
                cellB.vy -= fy * dt;
            }
        });

        // Apply damping to all cells
        this.cells.forEach(cell => {
            cell.vx *= damping;
            cell.vy *= damping;
        });
    }

    updateWandering(dt) {
        this.changeDirectionTimer -= dt;
        if (this.changeDirectionTimer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5;
            const forceX = Math.cos(angle) * speed;
            const forceY = Math.sin(angle) * speed;

            // Apply force to all cells
            this.cells.forEach(cell => {
                cell.vx += forceX * 0.1;
                cell.vy += forceY * 0.1;
            });

            this.changeDirectionTimer = 2 + Math.random() * 3;
        }

        // Gain energy from the environment
        this.cells.forEach(cell => {
            cell.energy += 0.02 * dt;
            cell.energy = Math.min(cell.energy, cell.maxEnergy);
        });
    }

    updatePhotosynthetic(dt, sim) {
        // Move toward light
        if (sim.lightSources.length > 0) {
            const light = sim.lightSources[0];
            const dx = light.x - this.x;
            const dy = light.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 50) {
                const speed = 1;
                const forceX = (dx / distance) * speed * 0.1;
                const forceY = (dy / distance) * speed * 0.1;

                // Apply force to all cells
                this.cells.forEach(cell => {
                    cell.vx += forceX;
                    cell.vy += forceY;
                });
            }

            // Gain energy from light
            this.cells.forEach(cell => {
                const cellDist = Math.sqrt((cell.x - light.x) ** 2 + (cell.y - light.y) ** 2);
                if (cellDist < light.intensity) {
                    const lightEnergy = (1 - cellDist / light.intensity) * 0.2;
                    cell.energy += lightEnergy * dt;
                    cell.energy = Math.min(cell.energy, cell.maxEnergy);
                }
            });
        }
    }

    updatePredator(dt, sim) {
        // Hunt for prey (cells and smaller organisms)
        let closestPrey = null;
        let closestDistance = this.huntingRange;

        // Look for cells
        sim.cells.forEach(cell => {
            if (cell.type !== 'predator') {
                const dx = cell.x - this.x;
                const dy = cell.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPrey = cell;
                }
            }
        });

        // Look for smaller organisms
        sim.organisms.forEach(organism => {
            if (organism !== this && organism.cellCount < this.cellCount) {
                const dx = organism.x - this.x;
                const dy = organism.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPrey = organism;
                }
            }
        });

        if (closestPrey) {
            const dx = closestPrey.x - this.x;
            const dy = closestPrey.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const speed = 2;
            const forceX = (dx / distance) * speed * 0.15;
            const forceY = (dy / distance) * speed * 0.15;

            // Apply hunting force to all cells
            this.cells.forEach(cell => {
                cell.vx += forceX;
                cell.vy += forceY;
            });

            // Consume if close enough (check each cell)
            this.cells.forEach(orgCell => {
                const dx = closestPrey.x - orgCell.x;
                const dy = closestPrey.y - orgCell.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < orgCell.radius + closestPrey.radius) {
                    const energyGain = closestPrey.energy * 0.5;
                    orgCell.energy += energyGain;
                    orgCell.energy = Math.min(orgCell.energy, orgCell.maxEnergy);
                    closestPrey.energy -= energyGain * 2;
                }
            });
        } else {
            // Wander if no prey
            if (Math.random() < 0.02) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2;
                const forceX = Math.cos(angle) * speed * 0.1;
                const forceY = Math.sin(angle) * speed * 0.1;

                this.cells.forEach(cell => {
                    cell.vx += forceX;
                    cell.vy += forceY;
                });
            }
        }

        // Lose energy faster
        this.cells.forEach(cell => {
            cell.energy -= 0.05 * dt;
        });
    }

    shouldReproduce() {
        const totalEnergy = this.energy;
        const totalMaxEnergy = this.cells.length * 100;
        return totalEnergy > totalMaxEnergy * 0.8 &&
               this.age > 8 &&
               this.reproductionCooldown <= 0;
    }

    reproduce() {
        const energyCost = this.cells.length * 40;

        // Deduct energy from cells
        this.cells.forEach(cell => {
            cell.energy -= 40;
        });

        this.reproductionCooldown = 15;

        // Create two new cells at organism edge
        const cellA = this.cellType === 'wandering' ? new WanderingCell(this.x + 20, this.y) :
                      this.cellType === 'photosynthetic' ? new PhotosyntheticCell(this.x + 20, this.y) :
                      new PredatorCell(this.x + 20, this.y);

        const cellB = this.cellType === 'wandering' ? new WanderingCell(this.x - 20, this.y) :
                      this.cellType === 'photosynthetic' ? new PhotosyntheticCell(this.x - 20, this.y) :
                      new PredatorCell(this.x - 20, this.y);

        const offspring = new Organism(cellA, cellB);

        return offspring;
    }

    render(ctx, showEnergy) {
        // Draw connections between cells first (so they appear behind cells)
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        this.connections.forEach(([idxA, idxB]) => {
            const cellA = this.cells[idxA];
            const cellB = this.cells[idxB];

            if (cellA && cellB) {
                ctx.beginPath();
                ctx.moveTo(cellA.x, cellA.y);
                ctx.lineTo(cellB.x, cellB.y);
                ctx.stroke();
            }
        });

        // Draw each cell
        this.cells.forEach(cell => {
            cell.render(ctx, showEnergy);
        });

        // Draw cell count badge at center
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.cellCount, this.x, this.y);
    }
}

// ==================== PARTICLE ====================

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1;
        this.maxLife = 1;
        this.size = 2 + Math.random() * 3;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 0.2 * dt; // Gravity
        this.life -= dt;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== MAIN APPLICATION ====================

let simulation;

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    simulation = new Simulation(canvas);

    // Animation loop
    let lastTime = performance.now();
    function animate() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        lastTime = currentTime;

        simulation.update(deltaTime);
        simulation.render();
        updateStats();

        requestAnimationFrame(animate);
    }
    animate();

    // Event listeners
    document.getElementById('pauseBtn').addEventListener('click', () => {
        simulation.isPaused = !simulation.isPaused;
        document.getElementById('pauseBtn').textContent =
            simulation.isPaused ? '▶ Resume' : '⏸ Pause';
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        simulation.reset();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        simulation.clear();
    });

    document.getElementById('addWanderingCell').addEventListener('click', () => {
        simulation.addWanderingCells(1);
    });

    document.getElementById('addPhotoCell').addEventListener('click', () => {
        simulation.addPhotoCells(1);
    });

    document.getElementById('addPredatorCell').addEventListener('click', () => {
        simulation.addPredatorCells(1);
    });

    document.getElementById('addPlant').addEventListener('click', () => {
        simulation.addPlants(1);
    });

    document.getElementById('addTree').addEventListener('click', () => {
        simulation.addTrees(1);
    });

    document.getElementById('speedSlider').addEventListener('input', (e) => {
        simulation.simulationSpeed = parseFloat(e.target.value);
        document.getElementById('speedValue').textContent = e.target.value;
    });

    document.getElementById('combineChanceSlider').addEventListener('input', (e) => {
        simulation.combinationChance = parseInt(e.target.value) / 100;
        document.getElementById('combineChanceValue').textContent = e.target.value;
    });

    document.getElementById('showEnergy').addEventListener('change', (e) => {
        simulation.showEnergy = e.target.checked;
    });

    document.getElementById('showTrails').addEventListener('change', (e) => {
        simulation.showTrails = e.target.checked;
    });

    // Canvas click to add entities
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Add random entity at click position
        const entityType = Math.floor(Math.random() * 5);
        switch(entityType) {
            case 0:
                simulation.cells.push(new WanderingCell(x, y));
                break;
            case 1:
                simulation.cells.push(new PhotosyntheticCell(x, y));
                break;
            case 2:
                simulation.cells.push(new PredatorCell(x, y));
                break;
            case 3:
                if (y > simulation.height - 100) {
                    simulation.plants.push(new Plant(x, simulation.height - 50));
                }
                break;
            case 4:
                if (y > simulation.height - 100) {
                    simulation.trees.push(new Tree(x, simulation.height - 50));
                }
                break;
        }
    });
});

function updateStats() {
    document.getElementById('cellCount').textContent = simulation.cells.length;
    document.getElementById('organismCount').textContent = simulation.organisms.length;
    document.getElementById('plantCount').textContent = simulation.plants.length;
    document.getElementById('treeCount').textContent = simulation.trees.length;
    document.getElementById('fps').textContent = simulation.fps;
}
