import { useState } from "react";
import { Link, Outlet } from "react-router-dom";

import { IRole } from "@/types";
import { hasRole, ROLE_LABELS } from "@/lib/roles";
import { hooklineApi } from "@/lib/hookline/api";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";

type RequireRoleProps = {
  /** Any one of these roles grants access (admins always pass). */
  roles: IRole[];
};

/** Route guard: renders child routes only for users with one of `roles`. */
const RequireRole = ({ roles }: RequireRoleProps) => {
  const { user, hasCheckedAuth, isLoading } = useUserContext();

  if (!hasCheckedAuth || (isLoading && !user.accountId)) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  if (hasRole(user, ...roles)) return <Outlet />;
  return <AccessDenied roles={roles} />;
};

const AccessDenied = ({ roles }: { roles: IRole[] }) => {
  const { toast } = useToast();
  const { checkAuthUser } = useUserContext();
  const [joining, setJoining] = useState(false);
  const writerArea = roles.includes("writer");

  const becomeWriter = async () => {
    setJoining(true);
    try {
      await hooklineApi.chooseRole("writer");
      await checkAuthUser();
      toast({ title: "Welcome, Writer!", description: "You now have access." });
    } catch (e) {
      toast({
        title: "Couldn't add the Writer role",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="common-container">
      <div className="max-w-xl w-full rounded-3xl border border-dark-4 bg-dark-2 p-8 text-center flex flex-col items-center gap-4">
        <p className="text-4xl" aria-hidden>
          ♪
        </p>
        <h2 className="h3-bold">
          {roles.map((r) => ROLE_LABELS[r]).join(" or ")} only
        </h2>
        {writerArea ? (
          <>
            <p className="base-regular text-light-2">
              This area is for songwriters. Join as a Writer to list your name,
              find co-writers, and follow the step-by-step guides.
            </p>
            <Button
              className="shad-button_primary px-8"
              onClick={becomeWriter}
              disabled={joining}
            >
              {joining ? <Loader /> : "I'm a Writer"}
            </Button>
          </>
        ) : (
          <p className="base-regular text-light-2">
            You don't have permission to view this page.
          </p>
        )}
        <Link to="/" className="small-medium text-light-3 hover:text-light-1">
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default RequireRole;
