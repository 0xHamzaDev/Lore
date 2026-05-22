"use client";

import type { EntityType } from "@lore/db";
import { Clock, Film, MapPin, Shield, User } from "lucide-react";
import type React from "react";
import { HTMLContainer, Rectangle2d, ShapeUtil, T } from "tldraw";
import type { RecordProps, TLShape } from "tldraw";

// ─── Module augmentation: register the shape with tldraw's type system ─────────

declare module "@tldraw/tlschema" {
  export interface TLGlobalShapePropsMap {
    "entity-shape": {
      entityId: string;
      entityType: EntityType;
      displayName: string;
      w: number;
      h: number;
    };
  }
}

// ─── Shape type ───────────────────────────────────────────────────────────────

export const ENTITY_SHAPE_TYPE = "entity-shape" as const;

export type EntityShape = TLShape<typeof ENTITY_SHAPE_TYPE>;

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ENTITY_ICONS: Record<
  EntityType,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  character: User,
  location: MapPin,
  faction: Shield,
  scene: Film,
  timeline_event: Clock,
};

// ─── Background colour map ────────────────────────────────────────────────────

const ENTITY_BG: Record<EntityType, string> = {
  character: "#e8f4f8",
  location: "#f0faf0",
  faction: "#fdf5e6",
  scene: "#f8f0fc",
  timeline_event: "#fff3f0",
};

// ─── ShapeUtil ────────────────────────────────────────────────────────────────

export class EntityShapeUtil extends ShapeUtil<EntityShape> {
  static override type = ENTITY_SHAPE_TYPE;

  static override props: RecordProps<EntityShape> = {
    entityId: T.string,
    entityType: T.literalEnum("character", "location", "faction", "scene", "timeline_event"),
    displayName: T.string,
    w: T.number,
    h: T.number,
  };

  override getDefaultProps(): EntityShape["props"] {
    return {
      entityId: "",
      entityType: "character",
      displayName: "Unnamed",
      w: 200,
      h: 120,
    };
  }

  override getGeometry(shape: EntityShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override component(shape: EntityShape) {
    const { entityType, displayName, w, h } = shape.props;
    const bg = ENTITY_BG[entityType];
    const Icon = ENTITY_ICONS[entityType];

    return (
      <HTMLContainer
        style={{
          width: w,
          height: h,
          backgroundColor: bg,
          borderRadius: 10,
          border: "1.5px solid rgba(0,0,0,0.10)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "10px 14px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {/* Severity dot placeholder (top-right) */}
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#9ca3af",
          }}
        />

        {/* Icon + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={18} />
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              lineHeight: 1.3,
              color: "#17171c",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              maxWidth: w - 60,
            }}
          >
            {displayName}
          </span>
        </div>

        {/* Entity type label */}
        <span
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "#6b7280",
            textTransform: "capitalize",
          }}
        >
          {entityType.replace("_", " ")}
        </span>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: EntityShape): Path2D | undefined {
    const { w, h } = shape.props;
    const r = 10;
    const path = new Path2D();
    path.roundRect(0, 0, w, h, r);
    return path;
  }
}
