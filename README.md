# 2D Cell & Plant Simulation

An interactive 2D simulation featuring cells with different behaviors and growing plants/trees. Watch as a living ecosystem emerges with predator-prey dynamics, photosynthesis, and plant growth.

## Features

### Cell Types

#### 1. Wandering Cells (Green)
- Move randomly throughout the environment
- Gain energy from the environment
- Reproduce when energy is high
- Simple autonomous behavior

#### 2. Photosynthetic Cells (Blue)
- Seek out light sources
- Generate energy through photosynthesis
- Move toward the sun
- Contain visible organelles
- Reproduce when well-fed

#### 3. Predator Cells (Red)
- Hunt other cells for energy
- Faster and larger than other cells
- Display aggressive behavior
- Have spikes/teeth visual features
- Consume other cells on contact

#### 4. Organisms (Multi-cell Clusters)
- Formed when cells of the same type attach together
- Attachment occurs with configurable chance (default 10%)
- Cells remain distinct and visibly connected
- Connected by visible bond lines (attachment points)
- Display cell count badge at cluster center
- Move together as coordinated group
- Spring physics keeps cells connected
- Cells can attach to existing organisms to grow them
- Each cell maintains individual energy and properties
- More powerful than single cells due to coordination

### Plant Life

#### Plants
- Start as seeds and grow upward
- Develop leaves along the stem
- Produce flowers when mature
- Sway gently in the wind
- Can reach heights of 80-120 pixels

#### Trees
- Larger, woody plants
- Grow taller than regular plants (150-250 pixels)
- Develop branches and thick trunks
- Create canopy foliage
- Multi-layered leaf structure for depth

## Simulation Mechanics

### Energy System
- All cells have energy that depletes over time
- Cells must maintain energy to survive
- Different cell types gain energy differently:
  - Wandering cells: Passive environmental absorption
  - Photosynthetic cells: Light exposure
  - Predator cells: Consuming other cells

### Reproduction
- Cells reproduce when:
  - Energy exceeds 80% of maximum
  - Age is above minimum threshold
  - Cooldown period has passed
- Reproduction costs 40% of max energy
- Offspring spawn near parent with slight variation

### Cell Attachment (Game of Life Inspired)
- Cells of the same type can attach into organisms
- Attachment chance is adjustable (1-100%, default 10%)
- Only non-predator cells can attach
- Cells remain visually distinct in clusters
- Visible connection bonds between attached cells
- Spring physics maintains organism cohesion
- Group movement through coordinated forces
- Cells can join existing organisms to grow them
- Properties distributed across all cells
- Creates particle effects when attaching

### Collisions
- Cells bounce off each other
- Predators consume prey on contact
- Energy transfer occurs during predation
- Particle effects show interactions

### Growth
- Plants and trees grow over time
- Growth rate varies by species
- Maximum height is randomized
- Visual features develop as they mature

## Controls

### Simulation Controls
- **Pause/Resume**: Stop and start the simulation
- **Reset**: Restart with initial population
- **Clear All**: Remove all entities

### Add Entities
- Click buttons to add specific cell types
- Click canvas to add random entities
- Plants/trees only spawn near ground

### Settings
- **Simulation Speed**: Adjust from 0.1x to 27.0x (extreme speed!)
- **Attachment Chance**: Control how likely cells attach (1-100%)
- **Show Energy Bars**: Toggle energy visualization
- **Show Cell Trails**: Toggle movement trails (future feature)

## Technical Details

### Architecture
- Pure JavaScript (no dependencies)
- HTML5 Canvas for rendering
- Object-oriented design
- Real-time physics simulation

### Performance
- Optimized collision detection
- Efficient rendering pipeline
- 60 FPS target
- Handles 100+ entities smoothly

### File Structure
```
sympathy/
├── index.html          # Main HTML structure
├── style.css           # Styling and layout
├── simulation.js       # Core simulation engine
└── README.md          # This file
```

## How to Run

1. Open `index.html` in any modern web browser
2. No build process or dependencies required
3. Works offline

## Usage Tips

1. **Start Simple**: Begin with a few entities to understand behaviors
2. **Balance the Ecosystem**: Too many predators will collapse the population
3. **Light Matters**: Photosynthetic cells thrive near the sun
4. **Let It Run**: Interesting patterns emerge over time
5. **Experiment**: Try different combinations and speeds

## Future Enhancements

Potential additions:
- Cell mutation system
- Different biomes
- Seasonal changes
- Food sources and resources
- Water simulation
- Day/night cycle
- Cell evolution over generations
- Save/load simulation states
- Custom cell designer

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE: Not supported (requires ES6)

## License

This project is open source and available for educational purposes.

## Credits

Created as a demonstration of:
- Object-oriented JavaScript
- Canvas 2D graphics
- Emergent behavior simulation
- Ecosystem dynamics
