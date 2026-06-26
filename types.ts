import Link from 'next/link';
export default function Header(){return <header className="header"><Link href="/" style={{color:'white',textDecoration:'none'}} className="brand">Boat AI</Link><nav className="nav"><Link href="/">開催場</Link><Link href="/dashboard">成績</Link></nav></header>}
