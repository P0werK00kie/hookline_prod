import { useEffect, useState } from "react";

import { IRole } from "@/types";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import { AdminUser } from "@/lib/hookline/api";
import { useAdminUsers, useSetUserRoles } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import Loader from "@/components/shared/Loader";
import PageHero from "@/components/writers/PageHero";

const AdminUsers = () => {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useAdminUsers(search);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="common-container">
      <div className="max-w-5xl w-full flex flex-col gap-8">
        <PageHero eyebrow="Admin" title="Users and roles">
          Grant or remove the Admin, Writer, and Singer roles. Changes take effect
          on the user's next page load.
        </PageHero>

        <Input
          type="search"
          aria-label="Search users"
          placeholder="Search by name or email"
          className="explore-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {isLoading ? (
          <Loader />
        ) : isError ? (
          <p className="text-red">{(error as Error).message}</p>
        ) : (
          <>
            <p className="small-regular text-light-3">
              Showing {data?.users.length} of {data?.total} users
            </p>
            <div className="w-full overflow-x-auto rounded-2xl border border-dark-4">
              <table className="w-full text-left small-regular">
                <thead className="bg-dark-3 text-light-3 subtle-semibold uppercase">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Joined</th>
                    {ROLES.map((r) => (
                      <th key={r} className="p-4 text-center">
                        {ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((u) => <UserRow key={u.id} user={u} />)}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const UserRow = ({ user }: { user: AdminUser }) => {
  const { user: me, checkAuthUser } = useUserContext();
  const { toast } = useToast();
  const setRoles = useSetUserRoles();
  const isMe = user.id === me.accountId;

  const toggle = async (role: IRole, on: boolean) => {
    const roles = on ? [...user.roles, role] : user.roles.filter((r) => r !== role);
    try {
      await setRoles.mutateAsync({ userId: user.id, roles });
      if (isMe) await checkAuthUser();
      toast({ title: `${user.name || user.email}: ${on ? "added" : "removed"} ${ROLE_LABELS[role]}` });
    } catch (e) {
      toast({ title: "Couldn't change role", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <tr className="border-t border-dark-4">
      <td className="p-4">
        <p className="small-semibold text-light-1">
          {user.name || "(no name)"} {isMe && <span className="text-light-3">(you)</span>}
        </p>
        <p className="subtle-semibold text-light-3">{user.email}</p>
      </td>
      <td className="p-4 text-light-3 whitespace-nowrap">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      {ROLES.map((r) => (
        <td key={r} className="p-4 text-center">
          <input
            type="checkbox"
            aria-label={`${ROLE_LABELS[r]} role for ${user.name || user.email}`}
            className="h-4 w-4 accent-primary-500"
            checked={user.roles.includes(r)}
            disabled={setRoles.isPending || (isMe && r === "admin")}
            title={isMe && r === "admin" ? "You can't remove your own Admin role" : undefined}
            onChange={(e) => toggle(r, e.target.checked)}
          />
        </td>
      ))}
    </tr>
  );
};

export default AdminUsers;
