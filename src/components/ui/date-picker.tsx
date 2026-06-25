"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { CalendarIcon, Clock2Icon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { ko } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

// ── DatePicker (날짜만) ───────────────────────────────────────────────────────

interface DatePickerProps {
  value?: string        // "YYYY-MM-DD"
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "날짜 선택",
  disabled,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const selected = useMemo(() => {
    if (!value) return undefined
    const d = parse(value, "yyyy-MM-dd", new Date())
    return isValid(d) ? d : undefined
  }, [value])

  function handleSelect(date: Date | undefined) {
    onChange?.(date ? format(date, "yyyy-MM-dd") : "")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-start gap-2 px-2.5 font-normal text-sm",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
          {selected
            ? format(selected, "yyyy년 M월 d일 (eee)", { locale: ko })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[280px] overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// ── DateTimePicker (날짜 + 시간) ──────────────────────────────────────────────

interface DateTimePickerProps {
  value?: string        // "YYYY-MM-DDTHH:mm"
  onChange?: (value: string) => void
  min?: string          // "YYYY-MM-DDTHH:mm"
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function DateTimePicker({
  value,
  onChange,
  min,
  placeholder = "날짜 및 시간 선택",
  disabled,
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)

  // 문자열 → 분리
  const datePart = value ? value.slice(0, 10) : ""
  const timePart = value ? value.slice(11, 16) : "09:00"

  const selected = useMemo(() => {
    if (!datePart) return undefined
    const d = parse(datePart, "yyyy-MM-dd", new Date())
    return isValid(d) ? d : undefined
  }, [datePart])

  const minDate = useMemo(() => {
    if (!min) return undefined
    const d = parse(min.slice(0, 10), "yyyy-MM-dd", new Date())
    return isValid(d) ? d : undefined
  }, [min])

  // 내부 상태 (팝오버 내부에서 임시로 관리)
  const [internalDate, setInternalDate] = useState<string>(datePart)
  const [internalTime, setInternalTime] = useState<string>(timePart)

  // 팝오버 열릴 때 현재 값으로 초기화
  React.useEffect(() => {
    if (open) {
      setInternalDate(datePart)
      setInternalTime(timePart || "09:00")
    }
  }, [open, datePart, timePart])

  function handleDateSelect(date: Date | undefined) {
    if (!date) return
    setInternalDate(format(date, "yyyy-MM-dd"))
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInternalTime(e.target.value)
  }

  function handleSubmit() {
    if (internalDate) {
      onChange?.(`${internalDate}T${internalTime}`)
    }
    setOpen(false)
  }

  // 트리거 표시 레이블
  const displayLabel = useMemo(() => {
    if (!selected) return placeholder
    const [hh, mm] = timePart.split(":")
    const h = parseInt(hh ?? "9", 10)
    const mer = h < 12 ? "오전" : "오후"
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${format(selected, "yyyy년 M월 d일 (eee)", { locale: ko })}  ${mer} ${h12}:${mm}`
  }, [selected, timePart, placeholder])

  // 내부 선택된 날짜 (미리보기)
  const internalSelected = useMemo(() => {
    if (!internalDate) return undefined
    const d = parse(internalDate, "yyyy-MM-dd", new Date())
    return isValid(d) ? d : undefined
  }, [internalDate])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-start gap-2 px-2.5 font-normal text-sm",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
          <span className="truncate">{displayLabel}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto min-w-[280px] overflow-hidden p-0" align="start">
        {/* 달력 */}
        <Calendar
          mode="single"
          selected={internalSelected}
          onSelect={handleDateSelect}
          defaultMonth={internalSelected ?? selected}
          disabled={minDate ? { before: minDate } : undefined}
        />

        {/* 시간 입력 + 확인 버튼 */}
        <div className="border-t bg-popover px-3 py-3 flex items-end gap-2">
          <FieldGroup className="flex-1 flex-row gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor={`${id}-time`}>시각</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id={`${id}-time`}
                  type="time"
                  step="60"
                  value={internalTime}
                  onChange={handleTimeChange}
                  disabled={!internalDate}
                  className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
                <InputGroupAddon align="inline-end">
                  <Clock2Icon className="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>

          <Button
            size="sm"
            className="h-8 shrink-0"
            disabled={!internalDate}
            onClick={handleSubmit}
          >
            확인
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
