/* 
   =========================================
   SwiftWash Premium Landing Page Logic System
   Core Stack: GSAP + ScrollTrigger + Lenis + Leaflet + Canvas FX
   =========================================
*/

document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------
    // 1. LENIS SMOOTH SCROLL INITIALIZATION
    // --------------------------------------------------
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        orientation: 'vertical',
        gestureOrientation: 'vertical',
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync GSAP ScrollTrigger with Lenis
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.lagSmoothing(0);


    // --------------------------------------------------
    // 2. LUSION LIQUID RIBBON CURSOR TRAIL & 3D MOUSE TILT
    // --------------------------------------------------
    const fxCanvas = document.getElementById('fx-canvas');
    const ctx = fxCanvas.getContext('2d');
    const customCursor = document.getElementById('custom-cursor');
    const phoneTiltWrapper = document.querySelector('.phone-tilt-wrapper');

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, targetX: window.innerWidth / 2, targetY: window.innerHeight / 2 };
    let points = [];
    const maxPoints = 25; // Length of the liquid ribbon
    let tilt = { x: 0, y: 0, targetX: 0, targetY: 0 };

    function resizeFxCanvas() {
        fxCanvas.width = window.innerWidth;
        fxCanvas.height = window.innerHeight;
    }
    resizeFxCanvas();
    window.addEventListener('resize', resizeFxCanvas);

    window.addEventListener('mousemove', (e) => {
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;

        // 3D perspective tilt coordinates calculation
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (e.clientX - cx) / cx;
        const dy = (e.clientY - cy) / cy;
        
        tilt.targetY = dx * 12; // Limit max tilt to 12 degrees
        tilt.targetX = -dy * 12;
    });

    // Custom pointer follow-lag and tilt engine
    function updateCursorLoop() {
        ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

        // Interpolate mouse position
        const prevMouseX = mouse.x;
        const prevMouseY = mouse.y;
        mouse.x += (mouse.targetX - mouse.x) * 0.16;
        mouse.y += (mouse.targetY - mouse.y) * 0.16;

        customCursor.style.left = `${mouse.targetX}px`;
        customCursor.style.top = `${mouse.targetY}px`;

        // Store ribbon track points
        points.push({ x: mouse.x, y: mouse.y });
        if (points.length > maxPoints) {
            points.shift();
        }

        // Draw liquid ribbon trail with dynamic tapering and gradient per segment
        if (points.length > 1) {
            // Calculate velocity for dynamic blur
            const vx = mouse.x - prevMouseX;
            const vy = mouse.y - prevMouseY;
            const velocity = Math.sqrt(vx * vx + vy * vy);
            const dynamicGlow = Math.min(10 + velocity * 0.8, 35);
            
            for (let i = 1; i < points.length; i++) {
                ctx.beginPath();
                ctx.moveTo(points[i - 1].x, points[i - 1].y);
                const xc = (points[i].x + points[i - 1].x) / 2;
                const yc = (points[i].y + points[i - 1].y) / 2;
                ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
                
                // Exponential decay tapering
                const ratio = i / points.length;
                const width = 16 * Math.pow(Math.E, -0.05 * (points.length - i));
                
                // Color transition from cyan/green solid tip to transparent tail
                const opacity = ratio;
                ctx.strokeStyle = `rgba(35, 151, 235, ${opacity * 0.75})`;
                if (i > points.length / 2) {
                    ctx.strokeStyle = `rgba(74, 174, 90, ${opacity * 0.85})`;
                }
                
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.shadowBlur = dynamicGlow;
                ctx.shadowColor = 'rgba(35, 151, 235, 0.4)';
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        // Interpolate 3D tilt with lag for inertia
        tilt.x += (tilt.targetX - tilt.x) * 0.08;
        tilt.y += (tilt.targetY - tilt.y) * 0.08;

        if (phoneTiltWrapper) {
            // Translate the tilt wrapper forward by 100px in the Z direction.
            // This prevents the rotated 3D phone body from penetrating the parent's Z=0 background plane,
            // which completely eliminates the diagonal clipping/glare bug in Webkit/Chrome.
            phoneTiltWrapper.style.transform = `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(100px)`;
            
            // Subtle internal parallax shifts (Use positive Z translations to create beautiful layered depth!)
            const statusCard = phoneTiltWrapper.querySelector('.status-card');
            const washStatus = phoneTiltWrapper.querySelector('.wash-status-container');
            const appHero = phoneTiltWrapper.querySelector('.app-hero');
            
            if (statusCard) {
                statusCard.style.transform = `translate3d(${-tilt.y * 1.5}px, ${tilt.x * 1.5}px, 20px)`;
            }
            if (washStatus) {
                washStatus.style.transform = `translate3d(${-tilt.y * 1.5}px, ${tilt.x * 1.5}px, 20px)`;
            }
            if (appHero) {
                appHero.style.transform = `translate3d(${-tilt.y * 1.0}px, ${tilt.x * 1.0}px, 10px)`;
            }
        }

        requestAnimationFrame(updateCursorLoop);
    }
    updateCursorLoop();


    // --------------------------------------------------
    // 3. LEAFLET MAP INITIALIZATION & SMOOTH MARKER SYNC
    // --------------------------------------------------
    let map = null;
    let driverMarker = null;
    let customerMarker = null;
    let routeLine = null;
    let mapTileLayer = null;
    
    let dispatchMap = null;
    let dispatchStoreMarker = null;
    let dispatchMapTileLayer = null;

    let deliveryMap = null;
    let deliveryDriverMarker = null;
    let deliveryCustomerMarker = null;
    let deliveryRouteLine = null;
    let deliveryMapTileLayer = null;
    let onMobileMapAnimationFinished = null;

    const deliveryRoute = [
        [19.0760, 72.8777],
        [19.0772, 72.8790],
        [19.0785, 72.8805],
        [19.0798, 72.8820],
        [19.0810, 72.8835],
        [19.0825, 72.8850],
        [19.0838, 72.8860],
        [19.0850, 72.8870]
    ];

    function initDeliveryMap() {
        if (deliveryMap) return;

        deliveryMap = L.map('delivery-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([19.0800, 72.8820], 14);

        const isLight = document.body.classList.contains('light-theme');
        const tileUrl = isLight 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        deliveryMapTileLayer = L.tileLayer(tileUrl, {
            maxZoom: 20
        }).addTo(deliveryMap);

        const driverIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #4aae5a;"><i class="fa-solid fa-motorcycle"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        const customerIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #2397eb;"><i class="fa-solid fa-house-user"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        // Add markers
        deliveryDriverMarker = L.marker(deliveryRoute[0], { icon: driverIcon }).addTo(deliveryMap);
        deliveryCustomerMarker = L.marker(deliveryRoute[deliveryRoute.length - 1], { icon: customerIcon }).addTo(deliveryMap);

        // Draw glowing route path
        deliveryRouteLine = L.polyline(deliveryRoute, {
            color: '#2397eb',
            weight: 4,
            opacity: 0.6,
            dashArray: '5, 8'
        }).addTo(deliveryMap);
    }

    let deliveryAnimateInterval = null;
    function startDeliveryRouteAnimation() {
        if (!deliveryDriverMarker) return;
        
        let index = 0;
        
        if (deliveryAnimateInterval) clearInterval(deliveryAnimateInterval);
        
        deliveryAnimateInterval = setInterval(() => {
            index = (index + 1) % deliveryRoute.length;
            const nextPos = deliveryRoute[index];
            
            deliveryDriverMarker.setLatLng(nextPos);
            deliveryMap.panTo(nextPos, { animate: true, duration: 1.0 });
        }, 2200);
    }

    function initDispatchMap() {
        if (dispatchMap) return;

        dispatchMap = L.map('dispatch-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([19.0805, 72.8820], 14);

        const isLight = document.body.classList.contains('light-theme');
        const tileUrl = isLight 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        dispatchMapTileLayer = L.tileLayer(tileUrl, {
            maxZoom: 20
        }).addTo(dispatchMap);

        const storeIcon = L.divIcon({
            html: `
                <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                    <div class="pulse-ring" style="width: 40px; height: 40px; border-color: var(--neon-green); position: absolute; top: 0; left: 0; animation: ring-pulse 1.8s infinite ease-out;"></div>
                    <div class="map-pulse-marker" style="background-color: var(--neon-green); position: relative; margin: 0; z-index: 10; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: 11px;"><i class="fa-solid fa-store"></i></div>
                </div>
            `,
            iconSize: [40, 40],
            className: 'custom-map-icon'
        });

        const customerIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #2397eb;"><i class="fa-solid fa-house-user"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        // Add markers
        dispatchStoreMarker = L.marker([19.0760, 72.8777], { icon: storeIcon }).addTo(dispatchMap);
        L.marker([19.0850, 72.8870], { icon: customerIcon }).addTo(dispatchMap);

        // Draw glowing route path between store and customer
        L.polyline([[19.0760, 72.8777], [19.0850, 72.8870]], {
            color: '#2397eb',
            weight: 4,
            opacity: 0.6,
            dashArray: '5, 8'
        }).addTo(dispatchMap);
    }
    
    const driverRoute = [
        [19.0760, 72.8777],
        [19.0772, 72.8790],
        [19.0785, 72.8805],
        [19.0798, 72.8820],
        [19.0810, 72.8835],
        [19.0825, 72.8850],
        [19.0838, 72.8860],
        [19.0850, 72.8870]
    ];

    function initMockMap() {
        if (map) return;

        map = L.map('pickup-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([19.0800, 72.8820], 14);

        const isLight = document.body.classList.contains('light-theme');
        const tileUrl = isLight 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        mapTileLayer = L.tileLayer(tileUrl, {
            maxZoom: 20
        }).addTo(map);

        // Custom div-based markers with neon status rings
        const driverIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #4aae5a;"><i class="fa-solid fa-motorcycle"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        const customerIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #2397eb;"><i class="fa-solid fa-house-user"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        // Add markers
        driverMarker = L.marker(driverRoute[0], { icon: driverIcon }).addTo(map);
        customerMarker = L.marker(driverRoute[driverRoute.length - 1], { icon: customerIcon }).addTo(map);

        // Draw glowing route path
        routeLine = L.polyline(driverRoute, {
            color: '#2397eb',
            weight: 4,
            opacity: 0.6,
            dashArray: '5, 8'
        }).addTo(map);
    }

    // Smooth marker movement simulation
    let animateInterval = null;
    function startDriverRouteAnimation() {
        if (!driverMarker) return;
        
        let index = 0;
        
        if (animateInterval) clearInterval(animateInterval);
        
        animateInterval = setInterval(() => {
            index = (index + 1) % driverRoute.length;
            const nextPos = driverRoute[index];
            
            // Smoothly pan map and shift marker coordinates
            driverMarker.setLatLng(nextPos);
            map.panTo(nextPos, { animate: true, duration: 1.0 });
        }, 2200);
    }


    // --------------------------------------------------
    // 4. GSAP SCROLLTRIGGER PHONE CHOREOGRAPHY & SCREENS
    // --------------------------------------------------
    const phone = document.getElementById('phone-container');
    
    // Create ScrollTrigger timeline for phone positions (mapped exactly to the 5 active sections)
    const phoneTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: '#hero',
            endTrigger: '#section-delivery',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5
        }
    });

    phoneTimeline
        .to(phone, { left: '25vw', scale: 0.95, rotation: 0, duration: 2.0, ease: 'sine.inOut' }) // Dispatch (Left)
        .to(phone, { left: '75vw', scale: 1.0, rotation: 0, duration: 2.0, ease: 'sine.inOut' })  // Pickup (Right)
        .to(phone, { left: '25vw', scale: 0.95, rotation: 0, duration: 2.0, ease: 'sine.inOut' }) // Wash (Left)
        .to(phone, { left: '75vw', scale: 1.0, rotation: 0, duration: 2.0, ease: 'sine.inOut' })  // Sorting (Right)
        .to(phone, { left: '25vw', scale: 0.95, rotation: 0, duration: 2.0, ease: 'sine.inOut' }) // Ironing (Left)
        .to(phone, { left: '75vw', scale: 1.0, rotation: 0, duration: 2.0, ease: 'sine.inOut' })  // Quality (Right)
        .to(phone, { left: '25vw', scale: 0.95, rotation: 0, duration: 2.0, ease: 'sine.inOut' }) // Packing (Left)
        .to(phone, { left: '75vw', scale: 1.0, rotation: 0, duration: 2.0, ease: 'sine.inOut' })  // Transit (Right)
        .to(phone, { left: '25vw', scale: 1.0, rotation: 0, duration: 2.0, ease: 'sine.inOut' });  // Delivery (Left)

    // Fade out phone container when entering the playground section
    ScrollTrigger.create({
        trigger: '#section-playground',
        start: 'top bottom',
        end: 'top center',
        scrub: true,
        onUpdate: (self) => {
            gsap.to(phone, {
                opacity: 1 - self.progress,
                scale: 1.05 - (0.25 * self.progress),
                overwrite: 'auto'
            });
        }
    });

    // Synchronize Phone Mockup Screen States with Viewport Sections
    const phoneSections = [
        { id: 'hero', state: 'hero' },
        { id: 'section-dispatch', state: 'dispatch' },
        { id: 'section-pickup-track', state: 'pickup' },
        { id: 'section-processing', state: 'wash' },
        { id: 'section-sorting', state: 'sorting' },
        { id: 'section-ironing', state: 'ironing' },
        { id: 'section-quality', state: 'quality' },
        { id: 'section-packing', state: 'packing' },
        { id: 'section-transit', state: 'transit' },
        { id: 'section-delivery', state: 'delivered' }
    ];

    phoneSections.forEach(sec => {
        ScrollTrigger.create({
            trigger: `#${sec.id}`,
            start: 'top 50%',
            end: 'bottom 50%',
            onToggle: (self) => {
                if (self.isActive) {
                    activatePhoneState(sec.state);
                }
            }
        });
    });

    function activatePhoneState(stateId) {
        const screens = document.querySelectorAll('#phone-container .screen-state');
        const targetScreen = document.getElementById(`screen-${stateId}`);
        
        if (targetScreen && !targetScreen.classList.contains('active')) {
            screens.forEach(el => el.classList.remove('active'));
            targetScreen.classList.add('active');
            
            // Step specific initializations
            if (stateId === 'dispatch') {
                setTimeout(() => {
                    initDispatchMap();
                    if (dispatchMap) {
                        dispatchMap.invalidateSize();
                    }
                }, 100);
            }

            if (stateId === 'pickup') {
                setTimeout(() => {
                    initMockMap();
                    if (map) {
                        map.invalidateSize();
                    }
                    startDriverRouteAnimation();
                }, 100);
            } else {
                if (animateInterval) {
                    clearInterval(animateInterval);
                    animateInterval = null;
                }
            }

            if (stateId === 'wash') {
                animateCircularProgress();
            }

            if (stateId === 'transit') {
                setTimeout(() => {
                    initDeliveryMap();
                    if (deliveryMap) {
                        deliveryMap.invalidateSize();
                    }
                    startDeliveryRouteAnimation();
                }, 100);
            } else {
                if (deliveryAnimateInterval) {
                    clearInterval(deliveryAnimateInterval);
                    deliveryAnimateInterval = null;
                }
            }

            if (stateId === 'delivered') {
                setTimeout(startConfetti, 100);
            } else {
                stopConfetti();
            }
        }
    }

    // Confetti canvas animation
    let confettiActive = false;
    function startConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        
        const cCtx = canvas.getContext('2d');
        canvas.width = canvas.clientWidth || 300;
        canvas.height = canvas.clientHeight || 600;
        
        let confettiPieces = [];
        const colors = ['#2397eb', '#4aae5a', '#ffffff', '#ffd700'];
        
        class Confetti {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * -40 - 20;
                this.size = Math.random() * 6 + 4;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.speed = Math.random() * 4 + 2;
                this.angle = Math.random() * Math.PI * 2;
                this.spin = Math.random() * 0.2 - 0.1;
            }
            update() {
                this.y += this.speed;
                this.angle += this.spin;
                this.x += Math.sin(this.angle) * 0.6;
            }
            draw() {
                cCtx.save();
                cCtx.translate(this.x, this.y);
                cCtx.rotate(this.angle);
                cCtx.fillStyle = this.color;
                cCtx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
                cCtx.restore();
            }
        }
        
        for (let i = 0; i < 60; i++) {
            confettiPieces.push(new Confetti());
        }
        
        confettiActive = true;
        
        function loop() {
            if (!confettiActive) return;
            cCtx.clearRect(0, 0, canvas.width, canvas.height);
            
            confettiPieces.forEach(p => {
                p.update();
                p.draw();
                
                if (p.y > canvas.height) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                }
            });
            
            requestAnimationFrame(loop);
        }
        loop();
    }

    function stopConfetti() {
        confettiActive = false;
        const canvas = document.getElementById('confetti-canvas');
        if (canvas) {
            const cCtx = canvas.getContext('2d');
            cCtx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // Animate percentage text inside rotating drum
    function animateCircularProgress() {
        const percentageText = document.querySelector('.percentage-overlay');
        if (!percentageText) return;
        
        let progress = { val: 0 };
        gsap.to(progress, {
            val: 95,
            duration: 3.5,
            ease: 'power1.out',
            onUpdate: () => {
                percentageText.textContent = `${Math.round(progress.val)}%`;
            }
        });
    }


    // --------------------------------------------------
    // 5. STEP 1 TYPOGRAPHY SCALE ZOOM ANIMATION
    // --------------------------------------------------
    gsap.from('#section-dispatch h2', {
        scrollTrigger: {
            trigger: '#section-dispatch',
            start: 'top 80%',
            end: 'top 30%',
            scrub: true
        },
        scale: 0.7,
        opacity: 0,
        transformOrigin: 'left center',
        ease: 'power2.out'
    });


    // --------------------------------------------------
    // 6. SPYLT-STYLE KINETIC TEXT SCROLL DISTORTION
    // --------------------------------------------------
    const kineticTexts = document.querySelectorAll('.kinetic-text');
    ScrollTrigger.create({
        onUpdate: (self) => {
            const vel = Math.abs(self.getVelocity());
            const stretch = Math.min(vel * 0.002, 4); // Cap distance warp to 4px (subtle stretch, no overlap)
            
            kineticTexts.forEach(el => {
                gsap.to(el, {
                    letterSpacing: `${stretch}px`,
                    duration: 0.25,
                    ease: 'power1.out',
                    overwrite: 'auto'
                });
            });
        }
    });


    // --------------------------------------------------
    // 7. MAKE ME PULSE PLAYGROUND WAVE MATRIX
    // --------------------------------------------------
    const pCanvas = document.getElementById('playground-canvas');
    const pCtx = pCanvas.getContext('2d');

    let pMouse = { x: 0, y: 0, rx: 0, ry: 0, isDragging: false };
    let pWidth, pHeight;
    let gridParticles = [];
    const spacing = 18; // Dense matrix layout

    function resizePlayground() {
        pWidth = pCanvas.parentElement.clientWidth;
        pHeight = pCanvas.parentElement.clientHeight;
        pCanvas.width = pWidth;
        pCanvas.height = pHeight;
        initMatrix();
    }

    class GridParticle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.ox = x;
            this.oy = y;
            this.vx = 0;
            this.vy = 0;
            this.size = 2;
            this.color = '35, 151, 235'; // Cyan default
        }

        update() {
            const dx = pMouse.rx - this.x;
            const dy = pMouse.ry - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = pMouse.isDragging ? 220 : 140;

            if (dist < maxDist) {
                // Wave displacement force calculation
                const angle = Math.atan2(dy, dx);
                const force = (maxDist - dist) * 0.12;
                
                this.vx -= Math.cos(angle) * force;
                this.vy -= Math.sin(angle) * force;
                this.color = '74, 174, 90'; // Shifts to green on interaction
            } else {
                this.color = '35, 151, 235';
            }

            // Return pull force
            const hx = this.ox - this.x;
            const hy = this.oy - this.y;
            this.vx += hx * 0.06;
            this.vy += hy * 0.06;

            // Friction
            this.vx *= 0.86;
            this.vy *= 0.86;

            this.x += this.vx;
            this.y += this.vy;
        }

        draw() {
            pCtx.beginPath();
            pCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            pCtx.fillStyle = `rgba(${this.color}, 0.55)`;
            pCtx.fill();
        }
    }

    function initMatrix() {
        gridParticles = [];
        for (let x = spacing; x < pWidth; x += spacing) {
            for (let y = spacing; y < pHeight; y += spacing) {
                gridParticles.push(new GridParticle(x, y));
            }
        }
    }

    const playSection = document.getElementById('section-playground');
    playSection.addEventListener('mousemove', (e) => {
        const rect = pCanvas.getBoundingClientRect();
        pMouse.x = e.clientX - rect.left;
        pMouse.y = e.clientY - rect.top;
    });

    playSection.addEventListener('mousedown', () => pMouse.isDragging = true);
    window.addEventListener('mouseup', () => pMouse.isDragging = false);

    function drawPlayground() {
        const isLight = document.body.classList.contains('light-theme');
        pCtx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.25)' : 'rgba(5, 6, 8, 0.25)'; // Smooth motion smear
        pCtx.fillRect(0, 0, pWidth, pHeight);

        pMouse.rx += (pMouse.x - pMouse.rx) * 0.12;
        pMouse.ry += (pMouse.y - pMouse.ry) * 0.12;

        gridParticles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(drawPlayground);
    }

    resizePlayground();
    window.addEventListener('resize', resizePlayground);
    drawPlayground();


    // --------------------------------------------------
    // 8. BACKGROUND SVG SCROLL-LINKED TRAIL
    // --------------------------------------------------
    const scrollPath = document.getElementById('scroll-trail-path');
    
    function updateScrollTrailPath() {
        if (!scrollPath) return;
        
        const anchorHero = document.getElementById('anchor-hero');
        const anchorDispatch = document.getElementById('anchor-dispatch');
        const anchorPickup = document.getElementById('anchor-pickup');
        const anchorWash = document.getElementById('anchor-wash');
        const anchorSorting = document.getElementById('anchor-sorting');
        const anchorIroning = document.getElementById('anchor-ironing');
        const anchorQuality = document.getElementById('anchor-quality');
        const anchorPacking = document.getElementById('anchor-packing');
        const anchorTransit = document.getElementById('anchor-transit');
        const anchorDelivered = document.getElementById('anchor-delivered');
        const footerBrand = document.querySelector('.footer-brand');
        
        if (!anchorHero || !anchorDispatch || !anchorPickup || !anchorWash || !anchorSorting || !anchorIroning || !anchorQuality || !anchorPacking || !anchorTransit || !anchorDelivered) return;
        
        function getCenterCoords(el) {
            const rect = el.getBoundingClientRect();
            const scrollY = window.scrollY || window.pageYOffset;
            const scrollX = window.scrollX || window.pageXOffset;
            return {
                x: rect.left + rect.width / 2 + scrollX,
                y: rect.top + rect.height / 2 + scrollY
            };
        }
        
        const p0 = getCenterCoords(anchorHero);
        const p1 = getCenterCoords(anchorDispatch);
        const p2 = getCenterCoords(anchorPickup);
        const p3 = getCenterCoords(anchorWash);
        const p4 = getCenterCoords(anchorSorting);
        const p5 = getCenterCoords(anchorIroning);
        const p6 = getCenterCoords(anchorQuality);
        const p7 = getCenterCoords(anchorPacking);
        const p8 = getCenterCoords(anchorTransit);
        const p9 = getCenterCoords(anchorDelivered);
        const p10 = footerBrand ? getCenterCoords(footerBrand) : { x: window.innerWidth / 2, y: document.body.scrollHeight };
        
        let d = `M ${p0.x} ${p0.y} `;
        
        // Smooth curves through all step anchors
        d += `C ${p0.x} ${p0.y + 350}, ${p1.x} ${p1.y - 350}, ${p1.x} ${p1.y} `;
        d += `C ${p1.x} ${p1.y + 350}, ${p2.x} ${p2.y - 350}, ${p2.x} ${p2.y} `;
        d += `C ${p2.x} ${p2.y + 350}, ${p3.x} ${p3.y - 350}, ${p3.x} ${p3.y} `;
        d += `C ${p3.x} ${p3.y + 350}, ${p4.x} ${p4.y - 350}, ${p4.x} ${p4.y} `;
        d += `C ${p4.x} ${p4.y + 350}, ${p5.x} ${p5.y - 350}, ${p5.x} ${p5.y} `;
        d += `C ${p5.x} ${p5.y + 350}, ${p6.x} ${p6.y - 350}, ${p6.x} ${p6.y} `;
        d += `C ${p6.x} ${p6.y + 350}, ${p7.x} ${p7.y - 350}, ${p7.x} ${p7.y} `;
        d += `C ${p7.x} ${p7.y + 350}, ${p8.x} ${p8.y - 350}, ${p8.x} ${p8.y} `;
        d += `C ${p8.x} ${p8.y + 350}, ${p9.x} ${p9.y - 350}, ${p9.x} ${p9.y} `;
        d += `C ${p9.x} ${p9.y + 350}, ${p10.x} ${p10.y - 350}, ${p10.x} ${p10.y}`;
        
        scrollPath.setAttribute('d', d);
        
        // Initialize dash array for progress drawing
        const pathLength = scrollPath.getTotalLength();
        scrollPath.style.strokeDasharray = pathLength;
        scrollPath.style.strokeDashoffset = pathLength;
        scrollPath.dataset.length = pathLength;
    }
    
    // Animate SVG path drawing with scroll
    ScrollTrigger.create({
        trigger: '.layout-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.0,
        onUpdate: (self) => {
            if (!scrollPath) return;
            const pathLength = parseFloat(scrollPath.dataset.length) || scrollPath.getTotalLength();
            const drawLength = pathLength * self.progress;
            scrollPath.style.strokeDashoffset = pathLength - drawLength;
        }
    });

    window.addEventListener('load', () => {
        updateScrollTrailPath();
        setTimeout(updateScrollTrailPath, 800); // Fail-safe check
    });
    window.addEventListener('resize', updateScrollTrailPath);





    // --------------------------------------------------
    // 10. LEFT-TO-RIGHT TYPOGRAPHY SWEEP REVEAL
    // --------------------------------------------------
    function initTypographySweep() {
        const elements = document.querySelectorAll('.kinetic-text');
        elements.forEach(el => {
            const text = el.textContent.trim();
            el.innerHTML = '';
            const words = text.split(' ');
            let charIndex = 0;
            words.forEach((word, wordIdx) => {
                const wordSpan = document.createElement('span');
                wordSpan.style.display = 'inline-block';
                wordSpan.style.whiteSpace = 'nowrap';
                
                for (let char of word) {
                    const charWrap = document.createElement('span');
                    charWrap.className = 'char-wrap';
                    
                    const charSpan = document.createElement('span');
                    charSpan.className = 'char';
                    charSpan.textContent = char;
                    
                    if (el.classList.contains('brand-title')) {
                        if (charIndex < 5) {
                            charSpan.classList.add('char-swift');
                        } else {
                            charSpan.classList.add('char-wash');
                        }
                    }
                    
                    charWrap.appendChild(charSpan);
                    wordSpan.appendChild(charWrap);
                    charIndex++;
                }
                
                el.appendChild(wordSpan);
                if (wordIdx < words.length - 1) {
                    el.appendChild(document.createTextNode(' '));
                    charIndex++;
                }
            });
        });
        
        elements.forEach(el => {
            const chars = el.querySelectorAll('.char');
            gsap.to(chars, {
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                },
                y: '0%',
                opacity: 1,
                duration: 0.8,
                stagger: 0.02,
                ease: 'power3.out'
            });
        });

        // Force a layout refresh so triggers align perfectly
        setTimeout(() => {
            ScrollTrigger.refresh();
        }, 100);
    }
    
    initTypographySweep();

    // --------------------------------------------------
    // Theme Toggle Logic
    // --------------------------------------------------
    const savedTheme = localStorage.getItem('swiftwash-theme');
    let isLight = false;
    if (savedTheme === 'light') {
        isLight = true;
    } else if (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        isLight = true;
    }

    if (isLight) {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        
        themeToggleBtn.addEventListener('click', () => {
            const isNowLight = document.body.classList.toggle('light-theme');
            localStorage.setItem('swiftwash-theme', isNowLight ? 'light' : 'dark');
            themeToggleBtn.innerHTML = isNowLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
            
            // Sync mobile button if it exists
            const mobThemeBtn = document.getElementById('mobile-theme-toggle');
            if (mobThemeBtn) {
                mobThemeBtn.innerHTML = isNowLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
            }

            // Re-run path alignment and scroll triggers in case layouts shift slightly
            setTimeout(() => {
                updateScrollTrailPath();
                ScrollTrigger.refresh();
            }, 150);

            // Dynamically switch map tile layers
            const newTileUrl = isNowLight 
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

            if (mapTileLayer) mapTileLayer.setUrl(newTileUrl);
            if (dispatchMapTileLayer) dispatchMapTileLayer.setUrl(newTileUrl);
            if (deliveryMapTileLayer) deliveryMapTileLayer.setUrl(newTileUrl);
            if (mobileMapTileLayer) mobileMapTileLayer.setUrl(newTileUrl);
            if (mobileDispatchMapTileLayer) mobileDispatchMapTileLayer.setUrl(newTileUrl);
            if (mobileDeliveryMapTileLayer) mobileDeliveryMapTileLayer.setUrl(newTileUrl);
        });
    }

    // --------------------------------------------------
    // MOBILE-SPECIFIC LAYOUT LOGIC
    // ==================================================
    let mobileDispatchMap = null;
    let mobileDispatchStoreMarker = null;
    let mobileDispatchMapTileLayer = null;

    let mobileMap = null;
    let mobileDriverMarker = null;
    let mobileCustomerMarker = null;
    let mobileRouteLine = null;
    let mobileMapTileLayer = null;

    let mobileDeliveryMap = null;
    let mobileDeliveryDriverMarker = null;
    let mobileDeliveryCustomerMarker = null;
    let mobileDeliveryRouteLine = null;
    let mobileDeliveryMapTileLayer = null;

    let mobileAnimateInterval = null;
    let mobileDeliveryAnimateInterval = null;

    function initMobileLayout() {
        const mobileScreen = document.getElementById('mobile-phone-screen');
        if (mobileScreen) {
            // Mobile Menu Drawer Controls
            const mobMenuBtn = document.getElementById('mobile-menu-btn');
            const mobDrawer = document.getElementById('mobile-drawer');
            const mobDrawerOverlay = document.getElementById('mobile-drawer-overlay');
            const mobDrawerClose = document.getElementById('mobile-drawer-close');

            if (mobMenuBtn && mobDrawer) {
                mobMenuBtn.addEventListener('click', (e) => {
                    console.log('Mobile menu button clicked');
                    mobDrawer.classList.add('active');
                });
                
                const closeDrawer = () => {
                    console.log('Mobile menu drawer closed');
                    mobDrawer.classList.remove('active');
                };

                if (mobDrawerOverlay) mobDrawerOverlay.addEventListener('click', closeDrawer);
                if (mobDrawerClose) mobDrawerClose.addEventListener('click', closeDrawer);
            }

            // Define timing specifications for mobile stages
            const mobileStates = [
                { state: 'hero', tabIndex: -1, duration: 3000, triggerId: null },
                { state: 'dispatch', tabIndex: 0, duration: 3000, triggerId: 'm-trigger-1' },
                { state: 'pickup', tabIndex: 1, duration: 'map-finish', triggerId: 'm-trigger-2' },
                { state: 'wash', tabIndex: 2, duration: 3000, triggerId: 'm-trigger-3' },
                { state: 'sorting', tabIndex: 3, duration: 1000, triggerId: 'm-trigger-4' },
                { state: 'ironing', tabIndex: 4, duration: 1000, triggerId: 'm-trigger-5' },
                { state: 'quality', tabIndex: 5, duration: 1000, triggerId: 'm-trigger-6' },
                { state: 'packing', tabIndex: 6, duration: 1000, triggerId: 'm-trigger-7' },
                { state: 'transit', tabIndex: 7, duration: 'map-finish', triggerId: 'm-trigger-8' },
                { state: 'delivered', tabIndex: 8, duration: 4000, triggerId: 'm-trigger-9' }
            ];

            let autoplayTimer = null;
            let currentStateIndex = 0; // Starts at Hero state

            // Expose map animation finish callback
            onMobileMapAnimationFinished = () => {
                // Verify the current screen is indeed a map animation state
                const currentItem = mobileStates[currentStateIndex];
                if (currentItem && currentItem.duration === 'map-finish') {
                    const nextIndex = (currentStateIndex + 1) % mobileStates.length;
                    const nextItem = mobileStates[nextIndex];
                    if (nextItem.triggerId) {
                        const triggerEl = document.getElementById(nextItem.triggerId);
                        if (triggerEl) {
                            triggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            };

            // Mobile ScrollTrigger registration
            mobileStates.forEach((item, idx) => {
                if (item.triggerId) {
                    ScrollTrigger.create({
                        trigger: `#${item.triggerId}`,
                        start: 'top 50%',
                        end: 'bottom 50%',
                        onToggle: (self) => {
                            if (self.isActive) {
                                activateMobilePhoneState(item.state, item.tabIndex);
                                currentStateIndex = idx;
                                resetAutoplayTimer();
                            }
                        }
                    });
                }
            });

            // Special ScrollTrigger for Hero State (top of page)
            ScrollTrigger.create({
                trigger: '.mobile-layout-container',
                start: 'top top',
                end: 'top 10%',
                onToggle: (self) => {
                    if (self.isActive) {
                        activateMobilePhoneState('hero', -1);
                        currentStateIndex = 0;
                        resetAutoplayTimer();
                    }
                }
            });

            function startAutoplayLoop() {
                if (autoplayTimer) clearTimeout(autoplayTimer);
                
                const currentItem = mobileStates[currentStateIndex];
                if (currentItem.duration === 'map-finish') {
                    // Do nothing; wait for map marker animation to complete and trigger callback
                    return;
                }
                
                autoplayTimer = setTimeout(() => {
                    // Determine next state index
                    const nextIndex = (currentStateIndex + 1) % mobileStates.length;
                    const nextItem = mobileStates[nextIndex];
                    
                    if (nextItem.triggerId) {
                        // Auto-scroll to the next trigger
                        const triggerEl = document.getElementById(nextItem.triggerId);
                        if (triggerEl) {
                            triggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        // Auto-scroll back to Hero (top of page)
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }, currentItem.duration);
            }

            function resetAutoplayTimer() {
                startAutoplayLoop();
            }

            // Bind click handlers to tabs to scroll directly to trigger
            const tabs = document.querySelectorAll('.mobile-tab');
            tabs.forEach((tab, index) => {
                tab.addEventListener('click', () => {
                    const stateIdx = mobileStates.findIndex(s => s.tabIndex === index);
                    if (stateIdx !== -1) {
                        const targetItem = mobileStates[stateIdx];
                        if (targetItem.triggerId) {
                            const triggerEl = document.getElementById(targetItem.triggerId);
                            if (triggerEl) {
                                triggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }
                    }
                });
            });

            // Start autoplay loop on load!
            startAutoplayLoop();
            
            // Setup Mobile Theme Toggle
            const mobThemeBtn = document.getElementById('mobile-theme-toggle');
            if (mobThemeBtn) {
                const currentIsLight = document.body.classList.contains('light-theme');
                mobThemeBtn.innerHTML = currentIsLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
                
                mobThemeBtn.addEventListener('click', () => {
                    const isLight = document.body.classList.toggle('light-theme');
                    localStorage.setItem('swiftwash-theme', isLight ? 'light' : 'dark');
                    
                    // Sync desktop button if it exists
                    const desktopThemeBtn = document.getElementById('theme-toggle');
                    if (desktopThemeBtn) {
                        desktopThemeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
                    }
                    mobThemeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';

                    const newTileUrl = isLight 
                        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

                    if (mobileMapTileLayer) mobileMapTileLayer.setUrl(newTileUrl);
                    if (mobileDispatchMapTileLayer) mobileDispatchMapTileLayer.setUrl(newTileUrl);
                    if (mobileDeliveryMapTileLayer) mobileDeliveryMapTileLayer.setUrl(newTileUrl);
                    if (mapTileLayer) mapTileLayer.setUrl(newTileUrl);
                    if (dispatchMapTileLayer) dispatchMapTileLayer.setUrl(newTileUrl);
                    if (deliveryMapTileLayer) deliveryMapTileLayer.setUrl(newTileUrl);
                });
            }
        }
    }

    function activateMobilePhoneState(stateId, index) {
        const screens = document.querySelectorAll('#mobile-phone-screen .screen-state');
        const targetScreen = document.getElementById(`mobile-screen-${stateId}`);
        
        if (targetScreen && !targetScreen.classList.contains('active')) {
            screens.forEach(el => el.classList.remove('active'));
            targetScreen.classList.add('active');

            // Handle tab highlighting & scrolling
            const tabsScroll = document.querySelector('.mobile-tabs-scroll');
            const activeTab = document.querySelectorAll('.mobile-tab')[index];
            if (tabsScroll && activeTab) {
                document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
                activeTab.classList.add('active');
                
                const offsetLeft = activeTab.offsetLeft;
                const width = activeTab.clientWidth;
                tabsScroll.parentElement.scrollTo({
                    left: offsetLeft - (window.innerWidth / 2) + (width / 2),
                    behavior: 'smooth'
                });
            }
            
            // Map/Progress initializations
            if (stateId === 'dispatch') {
                setTimeout(() => {
                    initMobileDispatchMap();
                    if (mobileDispatchMap) mobileDispatchMap.invalidateSize();
                }, 100);
            }

            if (stateId === 'pickup') {
                setTimeout(() => {
                    initMobileMockMap();
                    if (mobileMap) mobileMap.invalidateSize();
                    startMobileDriverRouteAnimation();
                }, 100);
            } else {
                if (mobileAnimateInterval) {
                    clearInterval(mobileAnimateInterval);
                    mobileAnimateInterval = null;
                }
            }

            if (stateId === 'wash') {
                animateMobileCircularProgress();
            }

            if (stateId === 'transit') {
                setTimeout(() => {
                    initMobileDeliveryMap();
                    if (mobileDeliveryMap) mobileDeliveryMap.invalidateSize();
                    startMobileDeliveryRouteAnimation();
                }, 100);
            } else {
                if (mobileDeliveryAnimateInterval) {
                    clearInterval(mobileDeliveryAnimateInterval);
                    mobileDeliveryAnimateInterval = null;
                }
            }

            if (stateId === 'delivered') {
                setTimeout(startMobileConfetti, 100);
            } else {
                stopMobileConfetti();
            }
        }
    }

    // Mobile Circular Progress
    function animateMobileCircularProgress() {
        const overlay = document.getElementById('mobile-screen-wash').querySelector('.percentage-overlay');
        const water = document.getElementById('mobile-screen-wash').querySelector('.drum-water');
        const clothes = document.getElementById('mobile-screen-wash').querySelector('.drum-clothes');
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            if (overlay) overlay.innerText = `${progress}%`;
            
            if (water) water.style.transform = `translateY(${100 - (progress * 0.7)}%)`;
            if (clothes) clothes.style.transform = `rotate(${progress * 7.2}deg)`;
            
            if (progress >= 100) clearInterval(interval);
        }, 30);
    }

    // Mobile Confetti Canvas Animation
    let mobConfettiActive = false;
    let mobConfettiInterval = null;
    function startMobileConfetti() {
        const canvas = document.getElementById('mobile-confetti-canvas');
        if (!canvas) return;
        
        const cCtx = canvas.getContext('2d');
        canvas.width = canvas.clientWidth || 300;
        canvas.height = canvas.clientHeight || 600;
        
        let confettiPieces = [];
        const colors = ['#2397eb', '#4aae5a', '#ffffff', '#ffd700'];
        
        class Confetti {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * -40 - 20;
                this.size = Math.random() * 6 + 4;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.speedY = Math.random() * 3 + 2;
                this.speedX = Math.random() * 2 - 1;
                this.rotation = Math.random() * 360;
                this.spinSpeed = Math.random() * 5 - 2.5;
            }
            update() {
                this.y += this.speedY;
                this.x += this.speedX;
                this.rotation += this.spinSpeed;
            }
            draw() {
                cCtx.save();
                cCtx.translate(this.x, this.y);
                cCtx.rotate((this.rotation * Math.PI) / 180);
                cCtx.fillStyle = this.color;
                cCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                cCtx.restore();
            }
        }
        
        mobConfettiActive = true;
        mobConfettiInterval = setInterval(() => {
            if (confettiPieces.length < 50) confettiPieces.push(new Confetti());
        }, 150);
        
        function loop() {
            if (!mobConfettiActive) return;
            cCtx.clearRect(0, 0, canvas.width, canvas.height);
            
            confettiPieces.forEach((p, idx) => {
                p.update();
                p.draw();
                if (p.y > canvas.height) confettiPieces[idx] = new Confetti();
            });
            
            requestAnimationFrame(loop);
        }
        loop();
    }

    function stopMobileConfetti() {
        mobConfettiActive = false;
        if (mobConfettiInterval) {
            clearInterval(mobConfettiInterval);
            mobConfettiInterval = null;
        }
    }

    // Mobile Maps Init
    function initMobileDispatchMap() {
        if (mobileDispatchMap) return;

        mobileDispatchMap = L.map('mobile-dispatch-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([19.0805, 72.8820], 14);

        const isLight = document.body.classList.contains('light-theme');
        const tileUrl = isLight 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        mobileDispatchMapTileLayer = L.tileLayer(tileUrl, { maxZoom: 20 }).addTo(mobileDispatchMap);

        const storeIcon = L.divIcon({
            html: `
                <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                    <div class="pulse-ring" style="width: 40px; height: 40px; border-color: var(--neon-green); position: absolute; top: 0; left: 0; animation: ring-pulse 1.8s infinite ease-out;"></div>
                    <div class="map-pulse-marker" style="background-color: var(--neon-green); position: relative; margin: 0; z-index: 10; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: 11px;"><i class="fa-solid fa-store"></i></div>
                </div>
            `,
            iconSize: [40, 40],
            className: 'custom-map-icon'
        });

        const customerIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #2397eb;"><i class="fa-solid fa-house-user"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        L.marker([19.0760, 72.8777], { icon: storeIcon }).addTo(mobileDispatchMap);
        L.marker([19.0850, 72.8870], { icon: customerIcon }).addTo(mobileDispatchMap);

        L.polyline([[19.0760, 72.8777], [19.0850, 72.8870]], {
            color: '#2397eb',
            weight: 4,
            opacity: 0.6,
            dashArray: '5, 8'
        }).addTo(mobileDispatchMap);
    }

    function initMobileMockMap() {
        if (mobileMap) return;

        mobileMap = L.map('mobile-pickup-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([19.0800, 72.8820], 14);

        const isLight = document.body.classList.contains('light-theme');
        const tileUrl = isLight 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        mobileMapTileLayer = L.tileLayer(tileUrl, { maxZoom: 20 }).addTo(mobileMap);

        const driverIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #4aae5a;"><i class="fa-solid fa-motorcycle"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        const customerIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #2397eb;"><i class="fa-solid fa-house-user"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        mobileDriverMarker = L.marker(driverRoute[0], { icon: driverIcon }).addTo(mobileMap);
        mobileCustomerMarker = L.marker(driverRoute[driverRoute.length - 1], { icon: customerIcon }).addTo(mobileMap);

        mobileRouteLine = L.polyline(driverRoute, {
            color: '#2397eb',
            weight: 4,
            opacity: 0.6,
            dashArray: '5, 8'
        }).addTo(mobileMap);
    }

    function startMobileDriverRouteAnimation() {
        if (!mobileDriverMarker) return;
        let index = 0;
        if (mobileAnimateInterval) clearInterval(mobileAnimateInterval);
        
        mobileDriverMarker.setLatLng(driverRoute[0]);
        if (mobileMap) mobileMap.panTo(driverRoute[0], { animate: false });

        mobileAnimateInterval = setInterval(() => {
            index++;
            if (index < driverRoute.length) {
                const nextPos = driverRoute[index];
                mobileDriverMarker.setLatLng(nextPos);
                mobileMap.panTo(nextPos, { animate: true, duration: 1.0 });
            }
            if (index === driverRoute.length - 1) {
                clearInterval(mobileAnimateInterval);
                mobileAnimateInterval = null;
                if (typeof onMobileMapAnimationFinished === 'function') {
                    setTimeout(onMobileMapAnimationFinished, 1200);
                }
            }
        }, 2200);
    }

    function initMobileDeliveryMap() {
        if (mobileDeliveryMap) return;

        mobileDeliveryMap = L.map('mobile-delivery-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([19.0800, 72.8820], 14);

        const isLight = document.body.classList.contains('light-theme');
        const tileUrl = isLight 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        mobileDeliveryMapTileLayer = L.tileLayer(tileUrl, { maxZoom: 20 }).addTo(mobileDeliveryMap);

        const driverIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #4aae5a;"><i class="fa-solid fa-motorcycle"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        const customerIcon = L.divIcon({
            html: '<div class="map-pulse-marker" style="background-color: #2397eb;"><i class="fa-solid fa-house-user"></i></div>',
            iconSize: [32, 32],
            className: 'custom-map-icon'
        });

        mobileDeliveryDriverMarker = L.marker(deliveryRoute[0], { icon: driverIcon }).addTo(mobileDeliveryMap);
        mobileDeliveryCustomerMarker = L.marker(deliveryRoute[deliveryRoute.length - 1], { icon: customerIcon }).addTo(mobileDeliveryMap);

        mobileDeliveryRouteLine = L.polyline(deliveryRoute, {
            color: '#2397eb',
            weight: 4,
            opacity: 0.6,
            dashArray: '5, 8'
        }).addTo(mobileDeliveryMap);
    }

    function startMobileDeliveryRouteAnimation() {
        if (!mobileDeliveryDriverMarker) return;
        let index = 0;
        if (mobileDeliveryAnimateInterval) clearInterval(mobileDeliveryAnimateInterval);
        
        mobileDeliveryDriverMarker.setLatLng(deliveryRoute[0]);
        if (mobileDeliveryMap) mobileDeliveryMap.panTo(deliveryRoute[0], { animate: false });

        mobileDeliveryAnimateInterval = setInterval(() => {
            index++;
            if (index < deliveryRoute.length) {
                const nextPos = deliveryRoute[index];
                mobileDeliveryDriverMarker.setLatLng(nextPos);
                mobileDeliveryMap.panTo(nextPos, { animate: true, duration: 1.0 });
            }
            if (index === deliveryRoute.length - 1) {
                clearInterval(mobileDeliveryAnimateInterval);
                mobileDeliveryAnimateInterval = null;
                if (typeof onMobileMapAnimationFinished === 'function') {
                    setTimeout(onMobileMapAnimationFinished, 1200);
                }
            }
        }, 2200);
    }

    // Run Mobile View Initialization
    initMobileLayout();
});
