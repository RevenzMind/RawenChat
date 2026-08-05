import type { Metadata } from "next";
import "./globals.css";
import { Viewport } from "next";
import { APP_INFO } from "@/constants/config";

export const viewport: Viewport = {
  themeColor: APP_INFO.THEME_COLOR,
};

export const metadata: Metadata = {
  title: APP_INFO.NAME,
  description: APP_INFO.DESCRIPTION,
  icons: { icon: "/logo.png" },
};

// Inline script — runs before first paint, no flash
const accentScript = `
(function(){
  try {
    var hex = localStorage.getItem('rawenchat_accent_color') || '#ff9a5c';
    var clean = hex.replace('#','');
    if(clean.length !== 6) return;
    var r=parseInt(clean.slice(0,2),16),g=parseInt(clean.slice(2,4),16),b=parseInt(clean.slice(4,6),16);
    var lum=(0.299*r+0.587*g+0.114*b)/255;
    var text=lum>0.55?'#1a1a1a':'#ffffff';
    var lighten=function(v){return Math.round(v+(255-v)*0.12);};
    var hr=lighten(r).toString(16).padStart(2,'0'),hg=lighten(g).toString(16).padStart(2,'0'),hb=lighten(b).toString(16).padStart(2,'0');
    var d=document.documentElement.style;
    d.setProperty('--accent',hex);
    d.setProperty('--accent-hover','#'+hr+hg+hb);
    d.setProperty('--accent-muted','rgba('+r+','+g+','+b+',0.15)');
    d.setProperty('--accent-border','rgba('+r+','+g+','+b+',0.3)');
    d.setProperty('--accent-text',text);
  }catch(e){}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="min-h-screen" suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <head><script dangerouslySetInnerHTML={{ __html: accentScript }} /></head>
      <body className="antialiased text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
