import { render, screen } from "@testing-library/react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./avatar"

test("sin imagen cargada se muestran las iniciales", () => {
  render(
    <Avatar className="ring-1">
      <AvatarImage src="https://app.test/nico.png" alt="Nico" />
      <AvatarFallback>NS</AvatarFallback>
      <AvatarBadge />
    </Avatar>
  )

  const fallback = screen.getByText("NS")
  expect(fallback).toHaveAttribute("data-slot", "avatar-fallback")
  const avatar = fallback.closest("[data-slot=avatar]")
  expect(avatar).toHaveAttribute("data-size", "default")
  expect(avatar).toHaveClass("ring-1")
  expect(avatar?.querySelector("[data-slot=avatar-badge]")).toBeInTheDocument()
})

test("el grupo apila avatares y muestra el resto contado", () => {
  render(
    <AvatarGroup>
      <Avatar size="sm">
        <AvatarFallback>NS</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+3</AvatarGroupCount>
    </AvatarGroup>
  )

  expect(screen.getByText("NS").closest("[data-slot=avatar]")).toHaveAttribute(
    "data-size",
    "sm"
  )
  expect(screen.getByText("+3")).toHaveAttribute("data-slot", "avatar-group-count")
  expect(screen.getByText("+3").parentElement).toHaveAttribute(
    "data-slot",
    "avatar-group"
  )
})
