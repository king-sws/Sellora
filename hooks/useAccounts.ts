// hooks/useAccounts.ts or utils/accountHandlers.ts

import { useState, useCallback } from 'react';
import { toast } from 'sonner'; // or your toast library

interface LinkedAccount {
  provider: string;
  type: string;
  createdAt: Date;
}

interface AccountsResponse {
  accounts: LinkedAccount[];
  count: number;
}

// Hook for managing linked accounts
export function useLinkedAccounts() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch linked accounts
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/accounts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setAccounts(data.accounts || []);
        return data;
      } else {
        const errorMsg = data.error || 'Failed to fetch accounts';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Fetch accounts error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Unlink an account
  const unlinkAccount = useCallback(async (provider: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/profile/accounts?provider=${encodeURIComponent(provider)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Remove the account from local state
        setAccounts(prev => 
          prev.filter(acc => acc.provider !== provider)
        );
        toast.success(data.message || `${provider} account unlinked`);
        return true;
      } else {
        const errorMsg = data.error || 'Failed to unlink account';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Unlink account error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify if account is linked
  const verifyAccount = useCallback(async (provider: string) => {
    try {
      const response = await fetch('/api/profile/accounts/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (response.ok) {
        return data.linked;
      }
      return false;
    } catch (err) {
      console.error('Verify account error:', err);
      return false;
    }
  }, []);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    unlinkAccount,
    verifyAccount,
  };
}

// Standalone handlers (if you prefer not using hooks)

export const accountHandlers = {
  // Fetch all linked accounts
  async fetchAccounts(): Promise<AccountsResponse | null> {
    try {
      const response = await fetch('/api/profile/accounts');
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        toast.error(data.error || 'Failed to fetch accounts');
        return null;
      }
    } catch (error) {
      console.error('Fetch accounts error:', error);
      toast.error('Network error. Please try again.');
      return null;
    }
  },

  // Unlink a specific account
  async unlinkAccount(provider: string): Promise<boolean> {
    try {
      const response = await fetch(
        `/api/profile/accounts?provider=${encodeURIComponent(provider)}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || `${provider} account unlinked`);
        return true;
      } else {
        toast.error(data.error || 'Failed to unlink account');
        return false;
      }
    } catch (error) {
      console.error('Unlink account error:', error);
      toast.error('Network error. Please try again.');
      return false;
    }
  },

  // Verify account linkage
  async verifyAccount(provider: string): Promise<boolean> {
    try {
      const response = await fetch('/api/profile/accounts/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();
      return data.linked || false;
    } catch (error) {
      console.error('Verify account error:', error);
      return false;
    }
  },
};

// Example usage in a component:
/*
function LinkedAccountsSection() {
  const { 
    accounts, 
    loading, 
    error, 
    fetchAccounts, 
    unlinkAccount 
  } = useLinkedAccounts();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleUnlink = async (provider: string) => {
    if (confirm(`Are you sure you want to unlink your ${provider} account?`)) {
      await unlinkAccount(provider);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Linked Accounts ({accounts.length})</h2>
      {accounts.map((account) => (
        <div key={account.provider}>
          <span>{account.provider}</span>
          <button onClick={() => handleUnlink(account.provider)}>
            Unlink
          </button>
        </div>
      ))}
    </div>
  );
}
*/