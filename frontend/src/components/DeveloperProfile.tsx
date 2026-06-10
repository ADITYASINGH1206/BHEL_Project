const DeveloperProfile = () => {

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col items-center p-md md:p-xl font-body-md relative overflow-hidden">

      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 blur-[120px] rounded-full pointer-events-none"></div>

      <nav className="absolute top-md md:top-lg flex gap-sm md:gap-md z-50 bg-surface/50 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/50 shadow-sm items-center">
        <a className="flex items-center gap-xs text-on-surface-variant font-label-caps text-[12px] hover:text-primary transition-colors px-sm py-xs" href="/">
          <span className="material-symbols-outlined text-[16px]">public</span> <span className="hidden md:inline">Public</span>
        </a>
        <a className="flex items-center gap-xs text-on-surface-variant font-label-caps text-[12px] hover:text-primary transition-colors px-sm py-xs" href="/admin">
          <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span> <span className="hidden md:inline">Admin Login</span>
        </a>
        <div className="w-[1px] h-[16px] bg-outline-variant/50 mx-1"></div>
        <a className="flex items-center gap-xs text-primary font-label-caps text-[12px] bg-primary/10 rounded-full transition-colors px-sm py-xs font-bold" href="/profile">
          <span className="material-symbols-outlined text-[16px]">developer_mode</span> <span className="hidden md:inline">Developer</span>
        </a>
      </nav>

      <main className="w-full max-w-[600px] flex flex-col items-center mt-12 md:mt-20 relative z-10 pb-xl">

        {/* Profile Image Container */}
        <div className="relative group mb-xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-20 group-hover:opacity-70 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-surface overflow-hidden shadow-2xl bg-surface-container">
            <img
              src="/aditya_kumar_singh.jpeg"
              alt="Developer Profile"
              className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-700 ease-in-out transform group-hover:scale-105"
            />
          </div>
        </div>

        {/* Bio Section */}
        <div className="bg-surface-container-low/60 backdrop-blur-xl border border-outline-variant/50 rounded-3xl p-lg md:p-2xl shadow-xl w-full text-center flex flex-col items-center mb-xl">
          <h1 className="font-headline-lg text-[32px] md:text-[40px] font-bold text-on-surface mb-xs tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Aditya Kumar Singh</span>
          </h1>
          <h2 className="font-title-md text-on-surface-variant mb-lg uppercase tracking-widest text-[14px]">
            Full-Stack Engineer | Quant & Data Science
          </h2>

          <p className="font-body-lg text-[16px] md:text-[18px] text-on-surface leading-relaxed max-w-[480px]">
            I'm a Full-Stack Developer specializing in high-performance
            web applications and algorithmic trading infrastructure.
            I bridge the gap between complex market structure strategies,often
            leveraging custom Pine Script and data driven backends and clean, intuitive user interfaces.
            I build the technology that turns raw market data into an actionable edge.
          </p>
        </div>

        {/* Social Links */}
        <div className="bg-surface-container-low/60 backdrop-blur-xl border border-outline-variant/50 rounded-3xl p-lg shadow-xl w-full flex flex-col items-center gap-md">
          <h3 className="font-label-caps text-on-surface-variant text-[12px] uppercase tracking-widest mb-sm">Let's Connect</h3>

          <div className="flex flex-col w-full gap-sm max-w-[320px]">
            <a
              href="https://github.com/ADITYASINGH1206"
              className="group flex items-center justify-between bg-surface border border-outline-variant rounded-xl p-sm px-md hover:border-primary hover:shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)] transition-all duration-300"
            >
              <div className="flex items-center gap-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-on-surface-variant group-hover:text-primary transition-colors">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="font-title-sm text-on-surface group-hover:font-bold transition-all">ADITYASINGH1206</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 group-hover:text-primary">arrow_forward</span>
            </a>

            <a
              href="https://www.linkedin.com/in/aditya-kumar-singh-93603b1b4/"
              className="group flex items-center justify-between bg-surface border border-outline-variant rounded-xl p-sm px-md hover:border-secondary hover:shadow-[0_0_15px_rgba(var(--color-secondary-rgb),0.3)] transition-all duration-300"
            >
              <div className="flex items-center gap-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-on-surface-variant group-hover:text-secondary transition-colors">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <span className="font-title-sm text-on-surface group-hover:font-bold transition-all truncate max-w-[150px] sm:max-w-[200px]">aditya-kumar-singh</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 group-hover:text-secondary">arrow_forward</span>
            </a>

            <a
              href="mailto:24ad10ad5@mitsgwl.ac.in"
              className="group flex items-center justify-between bg-surface border border-outline-variant rounded-xl p-sm px-md hover:border-error hover:shadow-[0_0_15px_rgba(var(--color-error-rgb),0.3)] transition-all duration-300"
            >
              <div className="flex items-center gap-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-on-surface-variant group-hover:text-error transition-colors">
                  <path d="M0 3v18h24v-18h-24zm6.623 7.929l-4.623 5.712v-9.458l4.623 3.746zm-4.141-5.929h19.035l-9.517 7.713-9.518-7.713zm5.694 7.188l3.824 3.099 3.83-3.104 5.612 6.817h-18.779l5.513-6.812zm9.208-1.264l4.616-3.741v9.348l-4.616-5.607z" />
                </svg>
                <span className="font-title-sm text-on-surface group-hover:font-bold transition-all truncate max-w-[150px] sm:max-w-[200px]">24ad10ad5@mitsgwl.ac.in</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 group-hover:text-error">arrow_forward</span>
            </a>
          </div>
        </div>

      </main>
    </div>
  );
};

export default DeveloperProfile;
