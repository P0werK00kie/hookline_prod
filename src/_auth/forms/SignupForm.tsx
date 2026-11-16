import * as z from "zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import { useToast } from "@/components/ui/use-toast";

import {
  useCreateUserAccount,
  useSignInAccount,
} from "@/lib/react-query/queries";
import { SignupValidation } from "@/lib/validation";
import { useUserContext } from "@/context/AuthContext";
import { hooklineApi } from "@/lib/hookline/api";

const ROLE_CHOICES = [
  { value: "writer", label: "I'm a Writer", hint: "Post songs, find co-writers, follow the guides" },
  { value: "singer", label: "I'm a Singer", hint: "Discover songs and connect with writers" },
] as const;

const SignupForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkAuthUser, isLoading: isUserLoading } = useUserContext();

  const form = useForm<z.infer<typeof SignupValidation>>({
    resolver: zodResolver(SignupValidation),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      role: undefined,
    },
  });

  // Queries
  const { mutateAsync: createUserAccount, isPending: isCreatingAccount } =
    useCreateUserAccount();
  const { mutateAsync: signInAccount, isPending: isSigningInUser } =
    useSignInAccount();

  // Handler
  const handleSignup = async ({ role, ...user }: z.infer<typeof SignupValidation>) => {
    try {
      const newUser = await createUserAccount(user);

      if (!newUser) {
        toast({
          title: "Sign up failed",
          description:
            "Unable to create account. The email may already be in use.",
          variant: "destructive",
        });
        return;
      }

      const session = await signInAccount({
        email: user.email,
        password: user.password,
      });

      if (!session) {
        toast({
          title: "Account created!",
          description: "Please login with your new account.",
        });
        navigate("/sign-in");
        return;
      }

      // Apply the Writer/Singer choice (role labels are set server-side).
      let roleSet = true;
      try {
        await hooklineApi.chooseRole(role);
      } catch (e) {
        roleSet = false;
        console.error("chooseRole failed", e);
      }

      const isLoggedIn = await checkAuthUser();

      if (isLoggedIn && !roleSet) {
        toast({
          title: "Account created",
          description:
            "We couldn't set your Writer/Singer role. You can choose it later from Writers Block.",
        });
      }

      if (isLoggedIn) {
        form.reset();
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully.",
        });
        navigate("/");
      } else {
        toast({
          title: "Login failed",
          description:
            "Account created but unable to login. Please try signing in.",
          variant: "destructive",
        });
        navigate("/sign-in");
      }
    } catch (error) {
      console.log({ error });
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <div className="sm:w-420 flex-center flex-col">
        <img src="/assets/images/logo.svg" alt="logo" />

        <h2 className="h3-bold md:h2-bold pt-5 sm:pt-12">
          Create a new account
        </h2>
        <p className="text-light-3 small-medium md:base-regular mt-2">
          Join Hook Line and Music. Enter your details to get started.
        </p>

        <form
          onSubmit={form.handleSubmit(handleSignup)}
          className="flex flex-col gap-5 w-full mt-4"
        >
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">I'm joining as</FormLabel>
                <FormControl>
                  <div role="radiogroup" className="grid grid-cols-2 gap-3">
                    {ROLE_CHOICES.map((c) => {
                      const on = field.value === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => field.onChange(c.value)}
                          className={`rounded-xl border p-4 text-left transition ${
                            on
                              ? "border-primary-500 bg-primary-500/15"
                              : "border-dark-4 bg-dark-3 hover:border-primary-500"
                          }`}
                        >
                          <span className="block base-semibold">{c.label}</span>
                          <span className="block subtle-semibold text-light-3 mt-1">
                            {c.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">Name</FormLabel>
                <FormControl>
                  <Input type="text" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">Username</FormLabel>
                <FormControl>
                  <Input type="text" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">Email</FormLabel>
                <FormControl>
                  <Input type="text" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">Password</FormLabel>
                <FormControl>
                  <Input type="password" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="shad-button_primary"
            disabled={isCreatingAccount || isSigningInUser || isUserLoading}
          >
            {isCreatingAccount || isSigningInUser || isUserLoading ? (
              <div className="flex-center gap-2">
                <Loader /> Loading...
              </div>
            ) : (
              "Sign Up"
            )}
          </Button>

          <p className="text-small-regular text-light-2 text-center mt-2">
            Already have an account?
            <Link
              to="/sign-in"
              className="text-primary-500 text-small-semibold ml-1"
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </Form>
  );
};

export default SignupForm;
