import './globals.css';

export const metadata = {
  title: 'Pivot Scanner',
  description: 'Pre-market stock scanner. Your setups, found before the open.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
