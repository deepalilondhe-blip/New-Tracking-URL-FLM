/**
 * ====================================================================
 * 🔌 PLAYWRIGHT ENGINE INTERCEPTOR & PERFORMANCE OPTIMIZER
 * ====================================================================
 * Hook into Node's module loading system to transparently swap
 * chromium with alternative engines (Firefox, WebKit) and apply
 * dynamic runtime performance optimizations (e.g. capping slowMo to 100ms).
 */
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id === 'playwright') {
    const playwright = originalRequire.apply(this, arguments);
    const targetBrowser = (process.env.PROCESS_BROWSER || 'chromium').toLowerCase();
    const engine = playwright[targetBrowser];
    
    if (engine) {
      console.log(`🔌 [Browser Interceptor] Intercepting and optimizing engine: ${targetBrowser.toUpperCase()}`);
      
      // Wrap launch to inject performance optimizations
      const originalLaunch = engine.launch;
      engine.launch = async function (options) {
        if (options) {
          // Dynamic slowMo capping to drastically increase submission speed
          if (typeof options.slowMo === 'number' && options.slowMo > 100) {
            console.log(`🔌 [Browser Interceptor] Speed Optimization: Capping slowMo from ${options.slowMo}ms to 100ms`);
            options.slowMo = 100;
          }
          
          // Filter out Chrome-only arguments for other engines
          if (options.args && targetBrowser !== 'chromium') {
            options.args = options.args.filter(arg => !arg.includes('start-maximized'));
          }
        }
        
        const browserInstance = await originalLaunch.apply(this, arguments);
        
        // Wrap newContext to sanitize mobile/touch options if running on Firefox
        const originalNewContext = browserInstance.newContext;
        browserInstance.newContext = async function (contextOptions) {
          if (contextOptions && targetBrowser === 'firefox') {
            console.log(`🔌 [Browser Interceptor] Sanitizing mobile context options for Firefox emulation...`);
            delete contextOptions.isMobile;
            delete contextOptions.hasTouch;
          }
          return originalNewContext.call(this, contextOptions);
        };
        
        return browserInstance;
      };

      // Wrap launchPersistentContext for safety coverage
      const originalLaunchPersistent = engine.launchPersistentContext;
      if (originalLaunchPersistent) {
        engine.launchPersistentContext = async function (userDataDir, options) {
          if (options) {
            if (typeof options.slowMo === 'number' && options.slowMo > 100) {
              console.log(`🔌 [Browser Interceptor] Speed Optimization (Persistent): Capping slowMo to 100ms`);
              options.slowMo = 100;
            }
            if (options.args && targetBrowser !== 'chromium') {
              options.args = options.args.filter(arg => !arg.includes('start-maximized'));
            }
            if (targetBrowser === 'firefox') {
              console.log(`🔌 [Browser Interceptor] Sanitizing persistent context options for Firefox...`);
              delete options.isMobile;
              delete options.hasTouch;
            }
          }
          return originalLaunchPersistent.apply(this, arguments);
        };
      }
      
      return {
        ...playwright,
        chromium: engine // Map 'chromium' exports to active optimized engine
      };
    }
  }
  return originalRequire.apply(this, arguments);
};
