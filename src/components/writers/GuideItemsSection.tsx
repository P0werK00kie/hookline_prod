import { FormEvent, useState } from "react";

import { IGuideItem, IGuideSection } from "@/types";
import { hasRole } from "@/lib/roles";
import { GuideItemInput } from "@/lib/hookline/data";
import {
  useDeleteGuideItem,
  useGuideItems,
  useSaveGuideItem,
} from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/shared/Loader";
import Modal from "./Modal";
import Section, { ComingSoon } from "./Section";

export const SECTION_LABELS: Record<IGuideSection, string> = {
  guild: "Local music guild",
  video: "Pro video",
  distribution: "Distribution partner",
  resource: "Resource",
  writing_group: "Local writing group",
  forum: "Hook Line and Music forum",
  attorney: "Entertainment attorney",
};

type GuideItemsSectionProps = {
  title: string;
  description?: string;
  sections: IGuideSection[];
  emptyText: string;
};

/** A list of links/listings that Admins can add to and edit in place. */
const GuideItemsSection = ({
  title,
  description,
  sections,
  emptyText,
}: GuideItemsSectionProps) => {
  const { user } = useUserContext();
  const isAdmin = hasRole(user, "admin");
  const { data: items, isLoading } = useGuideItems(sections, isAdmin);
  const [editing, setEditing] = useState<IGuideItem | "new" | null>(null);

  return (
    <Section
      title={title}
      description={description}
      action={
        isAdmin && (
          <Button
            size="sm"
            className="shad-button_dark_4"
            onClick={() => setEditing("new")}
          >
            + Add
          </Button>
        )
      }
    >
      {isLoading ? (
        <Loader />
      ) : !items?.length ? (
        <ComingSoon>{emptyText}</ComingSoon>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <li
              key={item.$id}
              className="rounded-2xl border border-dark-4 bg-dark-2 p-5 flex flex-col gap-2"
            >
              <div className="flex-between gap-3">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="base-semibold text-light-1 hover:text-primary-500"
                  >
                    {item.title}
                    <span className="sr-only"> (opens in a new tab)</span>
                    <span aria-hidden> ↗</span>
                  </a>
                ) : (
                  <p className="base-semibold">{item.title}</p>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    className="small-medium text-light-3 hover:text-light-1"
                  >
                    Edit
                  </button>
                )}
              </div>
              {item.description && (
                <p className="small-regular text-light-2">{item.description}</p>
              )}
              <div className="flex flex-wrap gap-2 subtle-semibold text-light-3">
                {sections.length > 1 && <span>{SECTION_LABELS[item.section]}</span>}
                {item.area && <span>· {item.area}</span>}
                {!item.published && (
                  <span className="text-[#FFB620]">· Draft (admins only)</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <GuideItemForm
          item={editing === "new" ? null : editing}
          sections={sections}
          nextPosition={(items?.length || 0) + 1}
          onClose={() => setEditing(null)}
        />
      )}
    </Section>
  );
};

type GuideItemFormProps = {
  item: IGuideItem | null;
  sections: IGuideSection[];
  nextPosition: number;
  onClose: () => void;
};

const GuideItemForm = ({ item, sections, nextPosition, onClose }: GuideItemFormProps) => {
  const { toast } = useToast();
  const save = useSaveGuideItem();
  const remove = useDeleteGuideItem();
  const [form, setForm] = useState<GuideItemInput>({
    section: item?.section || sections[0],
    title: item?.title || "",
    description: item?.description || "",
    url: item?.url || "",
    area: item?.area || "",
    position: item?.position ?? nextPosition,
    published: item?.published ?? true,
  });
  const set = <K extends keyof GuideItemInput>(k: K, v: GuideItemInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.url && !/^https?:\/\//i.test(form.url)) {
      toast({ title: "Links must start with http:// or https://", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({ id: item?.$id || null, input: form });
      toast({ title: item ? "Saved" : "Added" });
      onClose();
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    }
  };

  const onDelete = async () => {
    if (!item || !window.confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    try {
      await remove.mutateAsync(item.$id);
      onClose();
    } catch (err) {
      toast({ title: "Couldn't delete", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Modal open title={item ? "Edit listing" : "Add listing"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {sections.length > 1 && (
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Type</span>
            <select
              className="shad-input rounded-md px-3"
              value={form.section}
              onChange={(e) => set("section", e.target.value as IGuideSection)}
            >
              {sections.map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="shad-form_label">Title</span>
          <Input
            required
            maxLength={200}
            className="shad-input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="shad-form_label">Description</span>
          <Textarea
            maxLength={1000}
            className="shad-textarea"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="shad-form_label">Link (optional)</span>
          <Input
            type="url"
            maxLength={2000}
            placeholder="https://"
            className="shad-input"
            value={form.url}
            onChange={(e) => set("url", e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Area (optional)</span>
            <Input
              maxLength={128}
              placeholder="e.g. Nashville, TN"
              className="shad-input"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Order</span>
            <Input
              type="number"
              min={0}
              max={10000}
              className="shad-input"
              value={form.position}
              onChange={(e) => set("position", Number(e.target.value) || 0)}
            />
          </label>
        </div>
        <label className="flex items-center gap-3 small-medium">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set("published", e.target.checked)}
            className="h-4 w-4 accent-primary-500"
          />
          Published (visible to writers)
        </label>
        <div className="flex-between gap-3 mt-2">
          {item ? (
            <Button
              type="button"
              variant="ghost"
              className="text-red hover:bg-dark-4"
              onClick={onDelete}
              disabled={remove.isPending}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" className="shad-button_primary px-8" disabled={save.isPending}>
            {save.isPending ? <Loader /> : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default GuideItemsSection;
