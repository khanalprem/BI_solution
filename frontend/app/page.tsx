import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="bg-bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-accent-blue rounded-xl flex items-center justify-center text-white font-bold text-2xl">
              B
            </div>
            <div>
              <h1 className="text-2xl font-bold">BankBI</h1>
              <p className="text-text-secondary text-sm">Nepal Banking Intelligence Platform</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-accent-green-dim border border-[rgba(16,185,129,0.2)] text-accent-green p-4 rounded-lg">
              <div className="font-semibold mb-1">✅ Frontend UI Complete!</div>
              <div className="text-sm opacity-90">All dashboards and components have been implemented</div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Quick Start</h2>
              
              <div className="space-y-3">
                <div className="bg-bg-surface border border-border rounded-lg p-4">
                  <div className="font-medium text-sm mb-2">1. Import Sample Data (Backend)</div>
                  <code className="text-xs bg-bg-input px-2 py-1 rounded block">
                    cd backend && rails db:import_all
                  </code>
                  <p className="text-text-muted text-xs mt-2">
                    Make sure your sample data.csv is in the project root
                  </p>
                </div>
                
                <div className="bg-bg-surface border border-border rounded-lg p-4">
                  <div className="font-medium text-sm mb-2">2. Start Backend Server</div>
                  <code className="text-xs bg-bg-input px-2 py-1 rounded block">
                    cd backend && rails s -p 3001
                  </code>
                  <p className="text-text-muted text-xs mt-2">
                    Rails API will run on http://localhost:3001
                  </p>
                </div>
                
                <div className="bg-bg-surface border border-border rounded-lg p-4">
                  <div className="font-medium text-sm mb-2">3. View Dashboards</div>
                  <p className="text-text-muted text-xs">
                    Frontend is already running! Navigate to any dashboard below
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Available Dashboards</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Link href="/dashboard/executive" className="p-3 bg-bg-surface border border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue-dim transition-all">
                  <div className="font-medium text-sm">📊 Executive Overview</div>
                  <div className="text-text-muted text-xs">High-level metrics & trends</div>
                </Link>
                
                <Link href="/dashboard/branch" className="p-3 bg-bg-surface border border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue-dim transition-all">
                  <div className="font-medium text-sm">🏢 Branch & Regional</div>
                  <div className="text-text-muted text-xs">Branch performance analysis</div>
                </Link>
                
                <Link href="/dashboard/customer" className="p-3 bg-bg-surface border border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue-dim transition-all">
                  <div className="font-medium text-sm">👥 Customer & Portfolio</div>
                  <div className="text-text-muted text-xs">Customer segmentation</div>
                </Link>
                
                <Link href="/dashboard/risk" className="p-3 bg-bg-surface border border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue-dim transition-all">
                  <div className="font-medium text-sm">⚠️ Loan & Risk Quality</div>
                  <div className="text-text-muted text-xs">NPL tracking & risk management</div>
                </Link>
                
                <Link href="/dashboard/kpi" className="p-3 bg-bg-surface border border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue-dim transition-all">
                  <div className="font-medium text-sm">🌳 KPI Tree Analysis</div>
                  <div className="text-text-muted text-xs">Hierarchical KPI breakdown</div>
                </Link>
                
                <Link href="/dashboard/config" className="p-3 bg-bg-surface border border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue-dim transition-all">
                  <div className="font-medium text-sm">⚙️ Configuration</div>
                  <div className="text-text-muted text-xs">User & settings management</div>
                </Link>
                
                <Link href="/dashboard/financial" className="p-3 bg-bg-surface border border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue-dim transition-all">
                  <div className="font-medium text-sm">📈 Financial Results</div>
                  <div className="text-text-muted text-xs">P&L and financial performance</div>
                </Link>
                
                <Link href="/dashboard/digital" className="p-3 bg-bg-surface border border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue-dim transition-all">
                  <div className="font-medium text-sm">💻 Digital Channels</div>
                  <div className="text-text-muted text-xs">Mobile, internet & ATM</div>
                </Link>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border text-center text-text-muted text-xs">
              <p>BankBI v1.0 • Built with Next.js, Rails & PostgreSQL</p>
              <p className="mt-1">For Nepal banking sector • NPR currency formatting</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
