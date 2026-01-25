import { useState, useEffect } from "react";

interface TitlebarProps {
  onManageWorkspace?: () => void;
}

export function Titlebar({ onManageWorkspace: _onManageWorkspace }: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const maximized = await getCurrentWindow().isMaximized();
        setIsMaximized(maximized);
      } catch {
        // Not in Tauri environment
      }
    };

    checkMaximized();

    // Listen for window resize to update maximize state
    const handleResize = () => checkMaximized();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMinimize = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
    setIsMaximized(!isMaximized);
  };

  const handleClose = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  };

  return (
    <div className="h-full bg-background flex justify-between items-center select-none">


      < div className="flex h-full" >
        {/* Minimize */}
        < button
          className="w-[46px] h-full border-none bg-transparent hover:bg-accent flex justify-center items-center cursor-pointer text-muted-foreground transition-colors duration-100 rounded-none shadow-none p-0"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties
          }
          onClick={handleMinimize}
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <path fill="currentColor" d="M0 0h10v1H0z" />
          </svg>
        </button >

        {/* Maximize/Restore */}
        < button
          className="w-[46px] h-full border-none bg-transparent hover:bg-accent flex justify-center items-center cursor-pointer text-muted-foreground transition-colors duration-100 rounded-none shadow-none p-0"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          onClick={handleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {
            isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" >
                <path
                  fill="currentColor"
                  d="M2 0v2H0v8h8V8h2V0H2zm6 8H1V3h7v5zm1-6H3V1h6v1z"
                />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path
                  fill="currentColor"
                  d="M0 0v10h10V0H0zm9 9H1V1h8v8z"
                />
              </svg>
            )}
        </button >

        {/* Close */}
        < button
          className="w-[46px] h-full border-none bg-transparent hover:bg-red-600 flex justify-center items-center cursor-pointer text-muted-foreground hover:text-white transition-colors duration-100 rounded-none shadow-none p-0"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          onClick={handleClose}
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              fill="currentColor"
              d="M10 .7L9.3 0 5 4.3.7 0 0 .7 4.3 5 0 9.3l.7.7L5 5.7 9.3 10l.7-.7L5.7 5z"
            />
          </svg>
        </button >
      </div >
    </div >
  );
}
