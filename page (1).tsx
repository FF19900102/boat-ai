import './globals.css';
import Header from '@/components/Header';
export const metadata={title:'Boat AI',description:'競艇AIデータ分析'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body><Header/><main className="container">{children}</main></body></html>}
